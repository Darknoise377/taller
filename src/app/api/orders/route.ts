// src/app/api/orders/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentMethod } from '@prisma/client';
import { rateLimit } from '@/lib/rateLimit';
import { sendOrderCreatedEmail } from '@/lib/email/orderEmails';
import { calculateDiscountedTotal, clampPercentage, normalizeAmount } from '@/utils/formatCurrency';
import { z } from 'zod';

const createOrderSchema = z.object({
  products: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().positive(),
    })
  ).min(1, 'Debes enviar al menos un producto'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  customerName: z.string().trim().min(1, 'Nombre requerido').max(200),
  customerEmail: z.string().trim().email('Email inválido').max(254),
  address: z.string().trim().min(1, 'Dirección requerida').max(500),
  city: z.string().trim().min(1, 'Ciudad requerida').max(200),
  department: z.string().trim().max(200).optional(),
  state: z.string().trim().max(200).optional(), // compatibilidad con payload antiguo
  phone: z.string().trim().min(1, 'Teléfono requerido').max(30),
  postalCode: z.string().trim().max(20).optional(),
  cedula: z.string().trim().max(30).optional(),
  sellerId: z.string().trim().optional(),
  promoCodeApplied: z.string().trim().optional(),
});

// ❌ Eliminamos los objetos `paymentMap` y `statusMap`.
// Ya no son necesarios porque el frontend y el backend ahora usan los mismos valores de los enums.

/**
 * GET /api/orders
 * Devuelve órdenes paginadas. Acepta ?page=1&limit=50
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || '100')));
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        include: {
          products: { include: { product: true } },
          seller: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count(),
    ]);

    return NextResponse.json({ items: orders, total, page, limit }, { status: 200 });
  } catch (error) {
    console.error('❌ Error al obtener órdenes:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * POST /api/orders
 * Crea una nueva orden
 * 👇 MODIFICADO: Acepta los nuevos campos
 */
export async function POST(req: Request) {
  try {
    const limit = await rateLimit(req, {
      keyPrefix: 'orders-create',
      windowMs: 60 * 1000,
      max: 20,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { message: 'Demasiadas solicitudes. Intenta más tarde.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(limit.retryAfterSeconds ?? 60),
            'X-RateLimit-Limit': String(limit.limit),
            'X-RateLimit-Remaining': String(limit.remaining),
            'X-RateLimit-Reset': String(Math.ceil(limit.resetAt / 1000)),
          },
        }
      );
    }

    // ✅ Validar body con Zod
    const parseResult = createOrderSchema.safeParse(await req.json());
    if (!parseResult.success) {
      const message = parseResult.error.issues[0]?.message ?? 'Datos inválidos';
      return NextResponse.json({ message }, { status: 400 });
    }
    const {
      products,
      paymentMethod,
      customerName,
      customerEmail,
      address,
      city,
      department,
      state,
      postalCode,
      phone,
      cedula,
      sellerId,
      promoCodeApplied,
    } = parseResult.data;

    const resolvedDepartment = department ?? state;

    // Consolidar items (evita duplicados de productId)
    const quantitiesByProductId = new Map<string, number>();
    for (const item of products) {
      const productId = String(item?.productId ?? '').trim();
      const quantity = Number(item?.quantity);

      if (!productId) {
        return NextResponse.json({ message: 'Producto inválido' }, { status: 400 });
      }
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return NextResponse.json({ message: 'Cantidad inválida' }, { status: 400 });
      }

      quantitiesByProductId.set(productId, (quantitiesByProductId.get(productId) ?? 0) + quantity);
    }

    const productIds = Array.from(quantitiesByProductId.keys());

    // Cargar precios/stock desde DB (fuente de verdad)
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true, stock: true, category: true },
    });

    if (dbProducts.length !== productIds.length) {
      return NextResponse.json({ message: 'Uno o más productos no existen' }, { status: 400 });
    }

    // Validar stock + calcular subtotal
    let subtotal = 0;
    for (const p of dbProducts) {
      const qty = quantitiesByProductId.get(p.id) ?? 0;
      if (p.stock < qty) {
        return NextResponse.json(
          { message: 'No hay stock suficiente para uno o más productos' },
          { status: 400 }
        );
      }

      const normalizedPrice = normalizeAmount(p.price);
      if (normalizedPrice < 0) {
        return NextResponse.json({ message: 'Hay productos con precio inválido' }, { status: 400 });
      }

      subtotal = normalizeAmount(subtotal + normalizedPrice * qty);
    }

    // Validar promoción (si aplica) y calcular total final
    let promoCodeToStore: string | undefined = undefined;
    let finalTotal = subtotal;

    if (promoCodeApplied && promoCodeApplied.trim()) {
      const normalizedPromoCode = promoCodeApplied.trim().toUpperCase();
      const promotion = await prisma.promotion.findFirst({
        where: {
          code: normalizedPromoCode,
          isActive: true,
        },
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
        return NextResponse.json({ message: 'Código de promoción inválido' }, { status: 400 });
      }
      if (promotion.expiresAt && new Date() > promotion.expiresAt) {
        return NextResponse.json({ message: 'Este código de promoción ha expirado' }, { status: 400 });
      }
      const normalizedDiscount = clampPercentage(promotion.discount);
      if (normalizedDiscount <= 0 || normalizedDiscount > 100) {
        return NextResponse.json({ message: 'Promoción inválida' }, { status: 400 });
      }

      // Apply discount only to matching products based on promotion targeting
      if (promotion.appliesTo === 'ALL') {
        finalTotal = calculateDiscountedTotal(subtotal, normalizedDiscount).finalTotal;
      } else {
        // Calculate discount only on matching items
        let discountableSubtotal = 0;
        let nonDiscountableSubtotal = 0;

        for (const p of dbProducts) {
          const qty = quantitiesByProductId.get(p.id) ?? 0;
          const lineTotal = normalizeAmount(p.price) * qty;
          const matches =
            promotion.appliesTo === 'CATEGORY'
              ? promotion.targetCategories.includes(p.category as string)
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

    // Validar vendedor (si aplica)
    let sellerIdToStore: string | undefined = undefined;
    if (sellerId && sellerId.trim()) {
      const sellerExists = await prisma.seller.findUnique({
        where: { id: sellerId },
        select: { id: true },
      });
      if (sellerExists) sellerIdToStore = sellerExists.id;
    }

    // Redondeo consistente para evitar errores con flotantes.
    const totalToStore = normalizeAmount(finalTotal);

    // 👇 Crear orden + decrementar stock en una transacción atómica
    const newOrder = await prisma.$transaction(async (tx) => {
      // Decrementar stock con verificación optimista
      for (const [productId, qty] of quantitiesByProductId.entries()) {
          const result = await tx.product.updateMany({
            where: { id: productId, stock: { gte: qty } },
            data: { stock: { decrement: qty } },
          });
        if (result.count === 0) {
          throw new Error(`Stock insuficiente para producto ${productId}`);
        }
      }

      return tx.order.create({
        data: {
          total: totalToStore,
          paymentMethod,
          customerName,
          customerEmail,
          address,
          city,
          department: resolvedDepartment,
          postalCode,
          phone,
          cedula,
          
          // --- Campos Híbridos (Añadidos) ---
          promoCodeApplied: promoCodeToStore,
          sellerId: sellerIdToStore,
          
          products: {
            create: Array.from(quantitiesByProductId.entries()).map(([productId, quantity]) => {
              const prod = dbProducts.find((d) => d.id === productId);
              const unitPrice = prod ? normalizeAmount(prod.price) : 0;
              return {
                product: { connect: { id: productId } },
                quantity,
                unitPrice,
              };
            }),
          },
        },
        include: {
          products: { include: { product: true } },
          seller: true,
        },
      });
    });

    try {
      const productsForEmail = (newOrder.products as Array<{ quantity: number; product: { name: string; price: number } }>).map((item) => ({
        quantity: item.quantity,
        product: {
          name: item.product.name,
          price: item.product.price,
        },
      }));

      await sendOrderCreatedEmail({
        referenceCode: newOrder.referenceCode,
        customerName: newOrder.customerName,
        customerEmail: newOrder.customerEmail,
        total: newOrder.total,
        currency: newOrder.currency,
        paymentMethod: newOrder.paymentMethod,
        status: newOrder.status,
        products: productsForEmail,
        address: newOrder.address,
        city: newOrder.city,
        department: newOrder.department ?? undefined,
        phone: newOrder.phone,
      });
    } catch (mailError) {
      // El pedido ya fue creado: no devolvemos error al cliente por fallo de email.
      console.error('Error enviando email de confirmacion de pedido:', mailError);
    }

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.startsWith('Stock insuficiente')) {
      return NextResponse.json(
        { message: 'No hay stock suficiente para uno o más productos' },
        { status: 400 }
      );
    }
    console.error('❌ Error al crear orden:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}