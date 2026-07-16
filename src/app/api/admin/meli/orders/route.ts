import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/config/admin';
import { prisma } from '@/lib/prisma';
import { meliApi } from '@/lib/meli/client';
import { processMeliOrder } from '@/lib/meli/sync';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await verifyAdminToken(token);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    // Obtenemos las últimas 50 órdenes de MeLi ordenadas por creación
    const orders = await prisma.meliOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        meliOrderId: true,
        status: true,
        rawPayload: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ orders });
  } catch (err) {
    console.error('[meli/orders]', err);
    return NextResponse.json({ error: 'Error al cargar órdenes' }, { status: 500 });
  }
}

/** POST /api/admin/meli/orders — fetch recent orders from MeLi API and save missing ones */
export async function POST() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    // Identify the connected seller account
    const me = await meliApi.getMe();

    // Fetch up to 50 most recent orders from MeLi
    const result = await meliApi.searchOrders(me.id, 50);

    let synced = 0;
    const errors: string[] = [];

    for (const order of result.results) {
      const orderId = String(order.id);
      try {
        const exists = await prisma.meliOrder.findUnique({ where: { meliOrderId: orderId } });
        if (!exists) {
          await processMeliOrder(orderId);
          synced++;
        }
      } catch (err) {
        console.error(`[meli/orders/sync] Failed to process order ${orderId}:`, err);
        errors.push(orderId);
      }
    }

    return NextResponse.json({ synced, errors });
  } catch (err) {
    console.error('[meli/orders/sync]', err);
    return NextResponse.json({ error: 'Error al sincronizar órdenes desde MeLi' }, { status: 500 });
  }
}