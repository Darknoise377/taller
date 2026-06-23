import { PaymentMethod, type Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { estimateShippingWithConfig } from '@/config/shippingRates';
import { sendOrderCreatedEmail } from '@/lib/email/orderEmails';
import { buildWompiCheckoutUrl } from '@/lib/payments/wompi';
import { getShippingConfig } from '@/lib/store/getShippingConfig';
import { calculateDiscountedTotal, clampPercentage, normalizeAmount, calculateDisplayPrices } from '@/utils/formatCurrency';

export type CreateOrderErrorCode =
  | 'EMPTY_CART'
  | 'INVALID_PRODUCT'
  | 'INVALID_QUANTITY'
  | 'INVALID_COMBO'
  | 'COMBO_EXPIRED'
  | 'STOCK'
  | 'INVALID_PROMO'
  | 'PROMO_EXPIRED'
  | 'INVALID_PRICE'
  | 'MISSING_DEPARTMENT';

export class CreateOrderError extends Error {
  constructor(
    message: string,
    public readonly code: CreateOrderErrorCode,
  ) {
    super(message);
    this.name = 'CreateOrderError';
  }
}

export type OrderLineInput = { productId: string; quantity: number };
export type ComboLineInput = { comboId: string; quantity: number };

export type CreateOrderInput = {
  products?: OrderLineInput[];
  combos?: ComboLineInput[];
  paymentMethod: PaymentMethod;
  customerName: string;
  customerEmail: string;
  address: string;
  city: string;
  department?: string | null;
  postalCode?: string | null;
  phone: string;
  cedula?: string | null;
  sellerId?: string | null;
  sellerCode?: string | null;
  promoCodeApplied?: string | null;
  referenceCode?: string;
  sendConfirmationEmail?: boolean;
};

export type CreatedOrder = Prisma.OrderGetPayload<{
  include: {
    products: { include: { product: true } };
    orderCombos: { include: { combo: true } };
    seller: true;
  };
}>;

export type CreateOrderResult = {
  order: CreatedOrder;
  wompiPaymentUrl?: string;
};

const orderInclude = {
  products: { include: { product: true } },
  orderCombos: { include: { combo: true } },
  seller: true,
} as const;

export function consolidateProductLines(products: OrderLineInput[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of products) {
    const productId = String(item.productId ?? '').trim();
    const quantity = Number(item.quantity);
    if (!productId) {
      throw new CreateOrderError('Producto inválido', 'INVALID_PRODUCT');
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new CreateOrderError('Cantidad inválida', 'INVALID_QUANTITY');
    }
    map.set(productId, (map.get(productId) ?? 0) + quantity);
  }
  return map;
}

export function consolidateComboLines(combos: ComboLineInput[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of combos) {
    const comboId = String(item.comboId ?? '').trim();
    const quantity = Number(item.quantity);
    if (!comboId) {
      throw new CreateOrderError('Combo inválido', 'INVALID_COMBO');
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new CreateOrderError('Cantidad inválida', 'INVALID_QUANTITY');
    }
    map.set(comboId, (map.get(comboId) ?? 0) + quantity);
  }
  return map;
}

export function generateBrandedReferenceCode(): string {
  return `AR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function httpMessageForCode(code: CreateOrderErrorCode): string {
  switch (code) {
    case 'STOCK':
      return 'No hay stock suficiente para uno o más productos';
    case 'INVALID_PROMO':
      return 'Código de promoción inválido';
    case 'PROMO_EXPIRED':
      return 'Este código de promoción ha expirado';
    case 'COMBO_EXPIRED':
      return 'Uno o más combos han expirado';
    case 'INVALID_COMBO':
      return 'Uno o más combos no existen o no están disponibles';
    case 'EMPTY_CART':
      return 'Debes enviar al menos un producto o combo';
    case 'INVALID_PRICE':
      return 'Hay productos con precio inválido';
    case 'MISSING_DEPARTMENT':
      return 'Departamento requerido para calcular el envío';
    default:
      return 'Datos inválidos';
  }
}

export function createOrderErrorToHttpMessage(error: unknown): string {
  if (error instanceof CreateOrderError) {
    return httpMessageForCode(error.code);
  }
  if (error instanceof Error && error.message.startsWith('Stock insuficiente')) {
    return httpMessageForCode('STOCK');
  }
  return 'Error interno del servidor';
}

export type AssistantOrderResult = {
  success: boolean;
  referenceCode?: string;
  total?: string;
  paymentMethod?: string;
  wompiPaymentUrl?: string;
  error?: string;
};

export function toAssistantOrderResult(
  result: CreateOrderResult,
  paymentMethod: PaymentMethod,
): AssistantOrderResult {
  const { order, wompiPaymentUrl } = result;
  const totalFormatted = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: order.currency,
    minimumFractionDigits: 0,
  }).format(order.total);

  return {
    success: true,
    referenceCode: order.referenceCode,
    total: totalFormatted,
    paymentMethod: paymentMethod === 'WOMPI' ? 'Pago online (Wompi)' : 'Contraentrega',
    wompiPaymentUrl,
  };
}

interface ProductWithFlashSale {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  currency: string;
  finalPrice: number;
  flashSaleId: string | null;
}

async function applyFlashSalesToProducts(
  dbProducts: { id: string; price: number; category: string }[]
): Promise<Map<string, { price: number; flashSaleId: string | null }>> {
  const productPriceMap = new Map<string, { price: number; flashSaleId: string | null }>();
  const now = new Date();

  const activeFlashSales = await prisma.flashSale.findMany({
    where: {
      isActive: true,
      startTime: { lte: now },
      OR: [{ endTime: null }, { endTime: { gte: now } }],
    },
    select: {
      id: true,
      discount: true,
      mode: true,
      targetPrice: true,
      appliesTo: true,
      targetCategories: true,
      targetProductIds: true,
    },
  });

  for (const p of dbProducts) {
    let finalPrice = p.price;
    let appliedFlashSaleId: string | null = null;

    for (const sale of activeFlashSales) {
      let applies = false;
      if (sale.appliesTo === 'ALL') applies = true;
      else if (sale.appliesTo === 'CATEGORY' && sale.targetCategories.includes(p.category)) applies = true;
      else if (sale.appliesTo === 'PRODUCT' && sale.targetProductIds.includes(p.id)) applies = true;

      if (applies) {
        const result = calculateDisplayPrices({
          basePrice: p.price,
          discountPercentage: sale.discount,
          mode: sale.mode,
          targetPrice: sale.targetPrice,
        });
        finalPrice = result.displayPrice;
        appliedFlashSaleId = sale.id;
        break;
      }
    }
    productPriceMap.set(p.id, { price: normalizeAmount(finalPrice), flashSaleId: appliedFlashSaleId });
  }

  return productPriceMap;
}

export async function createOrderWithStock(input: CreateOrderInput): Promise<CreateOrderResult> {
  const directQuantities = consolidateProductLines(input.products ?? []);
  const combosById = consolidateComboLines(input.combos ?? []);

  if (directQuantities.size === 0 && combosById.size === 0) {
    throw new CreateOrderError('Debes enviar al menos un producto o combo', 'EMPTY_CART');
  }

  const stockQuantities = new Map(directQuantities);
  const comboIds = Array.from(combosById.keys());

  const dbCombos =
    comboIds.length > 0
      ? await prisma.combo.findMany({
          where: { id: { in: comboIds }, isActive: true },
          include: {
            items: {
              select: { productId: true, quantity: true },
            },
          },
        })
      : [];

  if (dbCombos.length !== comboIds.length) {
    throw new CreateOrderError('Uno o más combos no existen', 'INVALID_COMBO');
  }

  const orderComboLines: Array<{ comboId: string; quantity: number; unitPrice: number }> = [];
  let comboSubtotal = 0;

  for (const combo of dbCombos) {
    const qty = combosById.get(combo.id) ?? 0;
    if (combo.stock < qty) {
      throw new CreateOrderError('No hay stock suficiente para uno o más combos', 'STOCK');
    }
    if (combo.expiresAt && new Date() > combo.expiresAt) {
      throw new CreateOrderError('Este combo ha expirado', 'COMBO_EXPIRED');
    }

    const comboPrice = normalizeAmount(combo.price);
    if (comboPrice < 0) {
      throw new CreateOrderError('Combo con precio inválido', 'INVALID_PRICE');
    }

    comboSubtotal = normalizeAmount(comboSubtotal + comboPrice * qty);
    orderComboLines.push({ comboId: combo.id, quantity: qty, unitPrice: comboPrice });

    for (const item of combo.items) {
      const add = item.quantity * qty;
      stockQuantities.set(item.productId, (stockQuantities.get(item.productId) ?? 0) + add);
    }
  }

  const productIds = Array.from(stockQuantities.keys());
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
      category: true,
      currency: true,
    },
  });

  if (dbProducts.length !== productIds.length) {
    throw new CreateOrderError('Uno o más productos no existen', 'INVALID_PRODUCT');
  }

  const productPriceMap = await applyFlashSalesToProducts(dbProducts);

  let directSubtotal = 0;
  for (const p of dbProducts) {
    const stockQty = stockQuantities.get(p.id) ?? 0;
    const directQty = directQuantities.get(p.id) ?? 0;

    if (p.stock < stockQty) {
      throw new CreateOrderError('No hay stock suficiente', 'STOCK');
    }

    const { price: productPrice } = productPriceMap.get(p.id)!;

    if (directQty > 0) {
      directSubtotal = normalizeAmount(directSubtotal + productPrice * directQty);
    }
  }

  const subtotal = normalizeAmount(directSubtotal + comboSubtotal);
  let promoCodeToStore: string | undefined;
  let finalTotal = subtotal;

  if (input.promoCodeApplied?.trim()) {
    const normalizedPromoCode = input.promoCodeApplied.trim().toUpperCase();
    const promotion = await prisma.promotion.findFirst({
      where: { code: normalizedPromoCode, isActive: true },
      select: {
        code: true,
        discount: true,
        expiresAt: true,
        appliesTo: true,
        targetCategories: true,
        targetProductIds: true,
      },
    });

    if (!promotion) {
      throw new CreateOrderError('Código inválido', 'INVALID_PROMO');
    }
    if (promotion.expiresAt && new Date() > promotion.expiresAt) {
      throw new CreateOrderError('Código expirado', 'PROMO_EXPIRED');
    }

    // Verificar stacking con Flash Sales activas
    for (const p of dbProducts) {
      const directQty = directQuantities.get(p.id) ?? 0;
      if (directQty <= 0) continue;

      const { flashSaleId } = productPriceMap.get(p.id)!;
      if (flashSaleId) {
        throw new CreateOrderError(
          `No se puede aplicar cupón: "${p.name}" tiene una oferta Flash Sale activa`,
          'INVALID_PROMO'
        );
      }
    }

    const normalizedDiscount = clampPercentage(promotion.discount);
    if (normalizedDiscount <= 0 || normalizedDiscount > 100) {
      throw new CreateOrderError('Promoción inválida', 'INVALID_PROMO');
    }

    if (promotion.appliesTo === 'ALL') {
      finalTotal = calculateDiscountedTotal(subtotal, normalizedDiscount).finalTotal;
    } else {
      let discountableSubtotal = 0;
      let nonDiscountableSubtotal = comboSubtotal;

      for (const p of dbProducts) {
        const directQty = directQuantities.get(p.id) ?? 0;
        if (directQty <= 0) continue;

        const { price: productPrice } = productPriceMap.get(p.id)!;
        const lineTotal = productPrice * directQty;
        const matches =
          promotion.appliesTo === 'CATEGORY'
            ? promotion.targetCategories.includes(p.category)
            : promotion.targetProductIds.includes(p.id);

        if (matches) {
          discountableSubtotal += lineTotal;
        } else {
          nonDiscountableSubtotal += lineTotal;
        }
      }

      const discounted = calculateDiscountedTotal(discountableSubtotal, normalizedDiscount).finalTotal;
      finalTotal = discounted + nonDiscountableSubtotal;
    }

    promoCodeToStore = promotion.code;
  }

  let shippingCost = 0;
  const needsShipping =
    input.paymentMethod === PaymentMethod.WOMPI ||
    input.paymentMethod === PaymentMethod.CONTRAENTREGA;

  if (needsShipping) {
    const department = input.department?.trim();
    if (!department) {
      throw new CreateOrderError('Departamento requerido para calcular el envío', 'MISSING_DEPARTMENT');
    }

    const shippingConfig = await getShippingConfig();
    const shippingEstimate = estimateShippingWithConfig(
      department,
      input.paymentMethod as 'WOMPI' | 'CONTRAENTREGA',
      subtotal,
      shippingConfig,
    );
    shippingCost = normalizeAmount(shippingEstimate.total);
    finalTotal = normalizeAmount(finalTotal + shippingCost);
  }

  let sellerIdToStore: string | undefined;
  if (input.sellerId?.trim()) {
    const seller = await prisma.seller.findUnique({
      where: { id: input.sellerId.trim() },
      select: { id: true },
    });
    if (seller) sellerIdToStore = seller.id;
  } else if (input.sellerCode?.trim()) {
    const seller = await prisma.seller.findUnique({
      where: { code: input.sellerCode.trim() },
      select: { id: true },
    });
    if (seller) sellerIdToStore = seller.id;
  }

  const totalToStore = normalizeAmount(finalTotal);
  const currency = dbProducts[0]?.currency ?? 'COP';

  const order = await prisma.$transaction(async (tx) => {
    for (const [productId, qty] of stockQuantities.entries()) {
      const result = await tx.product.updateMany({
        where: { id: productId, stock: { gte: qty } },
        data: { stock: { decrement: qty } },
      });
      if (result.count === 0) {
        throw new Error(`Stock insuficiente para producto ${productId}`);
      }
    }

    for (const line of orderComboLines) {
      const result = await tx.combo.updateMany({
        where: { id: line.comboId, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity }, soldCount: { increment: line.quantity } },
      });
      if (result.count === 0) {
        throw new Error(`Stock insuficiente para combo ${line.comboId}`);
      }
    }

    return tx.order.create({
      data: {
        ...(input.referenceCode ? { referenceCode: input.referenceCode } : {}),
        total: totalToStore,
        shippingCost,
        currency,
        paymentMethod: input.paymentMethod,
        customerName: input.customerName.trim(),
        customerEmail: input.customerEmail.trim(),
        address: input.address.trim(),
        city: input.city.trim(),
        department: input.department?.trim() || null,
        postalCode: input.postalCode?.trim() || null,
        phone: input.phone.trim(),
        cedula: input.cedula?.trim() || null,
        promoCodeApplied: promoCodeToStore,
        sellerId: sellerIdToStore,
        products: {
          create: Array.from(stockQuantities.entries()).map(([productId, quantity]) => {
            const { price } = productPriceMap.get(productId)!;
            return {
              product: { connect: { id: productId } },
              quantity,
              unitPrice: price,
            };
          }),
        },
        orderCombos:
          orderComboLines.length > 0
            ? {
                create: orderComboLines.map((line) => ({
                  combo: { connect: { id: line.comboId } },
                  quantity: line.quantity,
                  unitPrice: line.unitPrice,
                })),
              }
            : undefined,
      },
      include: orderInclude,
    });
  });

  const sendEmail = input.sendConfirmationEmail !== false;
  if (sendEmail) {
    try {
      const productsForEmail = order.products.map((item) => ({
        quantity: item.quantity,
        product: {
          name: item.product.name,
          price: item.unitPrice,
        },
      }));

      const combosForEmail = order.orderCombos.map((item) => ({
        quantity: item.quantity,
        combo: {
          name: item.combo.name,
          price: item.unitPrice,
        },
      }));

      await sendOrderCreatedEmail({
        referenceCode: order.referenceCode,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        total: order.total,
        shippingCost: order.shippingCost,
        currency: order.currency,
        paymentMethod: order.paymentMethod,
        status: order.status,
        products: productsForEmail,
        combos: combosForEmail,
        address: order.address,
        city: order.city,
        department: order.department ?? undefined,
        phone: order.phone,
      });
    } catch (mailError) {
      console.error('[createOrder] Email confirmation failed:', mailError);
    }
  }

  const wompiPaymentUrl =
    input.paymentMethod === 'WOMPI'
      ? buildWompiCheckoutUrl({
          referenceCode: order.referenceCode,
          total: order.total,
          currency: order.currency,
          customerEmail: order.customerEmail,
          customerName: order.customerName,
          phone: order.phone,
        })
      : undefined;

  return { order, wompiPaymentUrl };
}