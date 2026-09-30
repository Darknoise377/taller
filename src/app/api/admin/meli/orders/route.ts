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
    const orders = await prisma.meliOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        meliOrderId: true,
        status: true,
        rawPayload: true,
        createdAt: true,
        realCommission: true,
        realShippingCost: true,
      },
    });

    // Map meliItemId -> product.basePrice for each order's items
    const meliItemIds = new Set<string>();
    for (const o of orders) {
      const payload = o.rawPayload as Record<string, unknown> | null;
      const items = payload?.order_items as Array<{ item?: { id?: string } }> | undefined;
      if (items) {
        for (const item of items) {
          if (item?.item?.id) meliItemIds.add(String(item.item.id));
        }
      }
    }

    const basePriceMap = new Map<string, number>();
    if (meliItemIds.size > 0) {
      const listings = await prisma.meliListing.findMany({
        where: { meliItemId: { in: [...meliItemIds] } },
        select: { meliItemId: true, product: { select: { price: true } } },
      });
      for (const l of listings) {
        basePriceMap.set(l.meliItemId, l.product.price);
      }
    }

    // Attach basePrice for each order (taking first item's price if multiple)
    const ordersWithBasePrice = orders.map((o) => {
      const payload = o.rawPayload as Record<string, unknown> | null;
      const items = payload?.order_items as Array<{ item?: { id?: string } }> | undefined;
      let basePrice = 0;
      if (items) {
        for (const item of items) {
          const price = item?.item?.id ? basePriceMap.get(String(item.item.id)) : undefined;
          if (price) {
            basePrice = price;
            break;
          }
        }
      }
      return { ...o, basePrice };
    });

    // Backfill acotado: para órdenes ya guardadas antes de trackear costos reales,
    // reprocesarlas (idempotente) para calcular comisión/envío reales.
    // Se espera (no fire-and-forget) porque en serverless (Vercel) el proceso puede
    // terminar apenas se responde, matando cualquier promesa en segundo plano.
    const pending = ordersWithBasePrice.filter(
      (o) => o.realCommission == null || o.realShippingCost == null,
    ).slice(0, 10);
    if (pending.length > 0) {
      await Promise.all(
        pending.map((o) =>
          processMeliOrder(o.meliOrderId).catch((err) => {
            console.warn(`[meli/orders] Backfill de costos reales falló para ${o.meliOrderId}:`, err);
          }),
        ),
      );
      // Releer solo las filas backfilleadas para devolver los valores frescos
      const refreshed = await prisma.meliOrder.findMany({
        where: { meliOrderId: { in: pending.map((o) => o.meliOrderId) } },
        select: { meliOrderId: true, realCommission: true, realShippingCost: true },
      });
      const refreshedMap = new Map(refreshed.map((r) => [r.meliOrderId, r]));
      for (const o of ordersWithBasePrice) {
        const fresh = refreshedMap.get(o.meliOrderId);
        if (fresh) {
          o.realCommission = fresh.realCommission;
          o.realShippingCost = fresh.realShippingCost;
        }
      }
    }

    return NextResponse.json({ orders: ordersWithBasePrice });
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