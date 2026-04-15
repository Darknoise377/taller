// src/app/api/orders/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentMethod } from '@prisma/client'; // ✅ Importamos los enums de Prisma
import { rateLimit } from '@/lib/rateLimit';
import { sendOrderCreatedEmail } from '@/lib/email/orderEmails';

// ❌ Eliminamos los objetos `paymentMap` y `statusMap`.
// Ya no son necesarios porque el frontend y el backend ahora usan los mismos valores de los enums.

/**
 * GET /api/orders
 * ... (sin cambios)
 */
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        products: { include: { product: true } },
        seller: true, // 👈 Opcional: Incluir datos del vendedor si existe
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders, { status: 200 });
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
    const limit = rateLimit(req, {
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

    // ✅ Definimos un tipo para el cuerpo de la solicitud
    type CreateOrderBody = {
      products: { productId: number; quantity: number }[];
      // NOTA: `total` puede venir del cliente pero NO se confía en él.
      // El total se recalcula server-side con precios en DB.
      total?: number;
      paymentMethod: PaymentMethod;
      customerName: string;
      customerEmail: string;
      address: string;
      city: string;
      department?: string;
      // Compatibilidad con payload antiguo (checkout enviaba `state`)
      state?: string;
      phone: string;
      postalCode?: string;
      cedula?: string;
      
      // --- Campos Híbridos (Añadidos) ---
      sellerId?: string;
      promoCodeApplied?: string;
    };

    const body: CreateOrderBody = await req.json();
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
      
      // --- Campos Híbridos (Añadidos) ---
      sellerId,
      promoCodeApplied,
    } = body;

    const resolvedDepartment = department ?? state;

    // --- Validaciones (sin cambios) ---
    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ message: 'Debes enviar al menos un producto' }, { status: 400 });
    }
    if (!customerName || !customerEmail || !address || !city || !phone) {
      return NextResponse.json({ message: 'Faltan datos del cliente' }, { status: 400 });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return NextResponse.json({ message: 'Email inválido' }, { status: 400 });
    }
    // Opcional: Validar que el paymentMethod sea uno de los valores del enum
    if (!Object.values(PaymentMethod).includes(paymentMethod)) {
       return NextResponse.json({ message: 'Método de pago inválido' }, { status: 400 });
    }
    // --- Fin Validaciones ---

    // Consolidar items (evita duplicados de productId)
    const quantitiesByProductId = new Map<number, number>();
    for (const item of products) {
      const productId = Number(item?.productId);
      const quantity = Number(item?.quantity);

      if (!Number.isInteger(productId) || productId <= 0) {
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
      select: { id: true, price: true, stock: true },
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
      subtotal += p.price * qty;
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
        select: { code: true, discount: true, expiresAt: true },
      });

      if (!promotion) {
        return NextResponse.json({ message: 'Código de promoción inválido' }, { status: 400 });
      }
      if (promotion.expiresAt && new Date() > promotion.expiresAt) {
        return NextResponse.json({ message: 'Este código de promoción ha expirado' }, { status: 400 });
      }
      if (typeof promotion.discount !== 'number' || promotion.discount <= 0 || promotion.discount > 100) {
        return NextResponse.json({ message: 'Promoción inválida' }, { status: 400 });
      }

      const discountAmount = subtotal * (promotion.discount / 100);
      finalTotal = Math.max(0, subtotal - discountAmount);
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

    // Redondeo consistente (evita cambios por flotantes). Mantiene 1 decimal como en PayU redirect actual.
    const totalToStore = Math.round(finalTotal * 10) / 10;

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
            create: Array.from(quantitiesByProductId.entries()).map(([productId, quantity]) => ({
              productId,
              quantity,
            })),
          },
        },
        include: {
          products: { include: { product: true } },
          seller: true,
        },
      });
    });

    try {
      await sendOrderCreatedEmail({
        referenceCode: newOrder.referenceCode,
        customerName: newOrder.customerName,
        customerEmail: newOrder.customerEmail,
        total: newOrder.total,
        currency: newOrder.currency,
        paymentMethod: newOrder.paymentMethod,
        status: newOrder.status,
        products: newOrder.products.map((item) => ({
          quantity: item.quantity,
          product: {
            name: item.product.name,
            price: item.product.price,
          },
        })),
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