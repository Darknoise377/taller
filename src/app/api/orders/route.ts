// src/app/api/orders/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentMethod } from '@prisma/client';
import { rateLimit } from '@/lib/rateLimit';
import {
  createOrderWithStock,
  createOrderErrorToHttpMessage,
  CreateOrderError,
} from '@/lib/orders/createOrder';
import { z } from 'zod';

const createOrderSchema = z.object({
  products: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .optional()
    .default([]),
  combos: z
    .array(
      z.object({
        comboId: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .optional()
    .default([]),
  paymentMethod: z.nativeEnum(PaymentMethod),
  customerName: z.string().trim().min(1, 'Nombre requerido').max(200),
  customerEmail: z.string().trim().email('Email inválido').max(254),
  address: z.string().trim().min(1, 'Dirección requerida').max(500),
  city: z.string().trim().min(1, 'Ciudad requerida').max(200),
  department: z.string().trim().max(200).optional(),
  state: z.string().trim().max(200).optional(),
  phone: z.string().trim().min(1, 'Teléfono requerido').max(30),
  postalCode: z.string().trim().max(20).optional(),
  cedula: z.string().trim().max(30).optional(),
  sellerId: z.string().trim().optional(),
  promoCodeApplied: z.string().trim().optional(),
});

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
          orderCombos: { include: { combo: true } },
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
 * Crea una nueva orden (precios y stock validados en servidor).
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
        },
      );
    }

    const parseResult = createOrderSchema.safeParse(await req.json());
    if (!parseResult.success) {
      const message = parseResult.error.issues[0]?.message ?? 'Datos inválidos';
      return NextResponse.json({ message }, { status: 400 });
    }

    const {
      products,
      combos,
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

    if (products.length === 0 && combos.length === 0) {
      return NextResponse.json(
        { message: 'Debes enviar al menos un producto o combo' },
        { status: 400 },
      );
    }

    const { order } = await createOrderWithStock({
      products,
      combos,
      paymentMethod,
      customerName,
      customerEmail,
      address,
      city,
      department: department ?? state,
      postalCode,
      phone,
      cedula,
      sellerId,
      promoCodeApplied,
      sendConfirmationEmail: true,
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof CreateOrderError) {
      return NextResponse.json(
        { message: createOrderErrorToHttpMessage(error) },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : '';
    if (message.startsWith('Stock insuficiente')) {
      return NextResponse.json(
        { message: 'No hay stock suficiente para uno o más productos' },
        { status: 400 },
      );
    }
    console.error('❌ Error al crear orden:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
