import { NextRequest, NextResponse } from 'next/server';
import { expireStalePendingWompiOrders } from '@/lib/orders/expirePendingOrders';
import { bulkSyncAutoSchedule } from '@/lib/meli/sync';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

/**
 * GET /api/cron/expire-pending-orders
 * Vercel Cron (Single free cron for Hobby plan):
 * 1. Cancels stale WOMPI PENDING orders and restores local stock.
 * 2. Automatically syncs pending/modified products and combos with MeLi, and pulls new orders.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const wompiResult = await expireStalePendingWompiOrders();

    // Also run MeLi auto-sync during this scheduled job
    let meliSyncResult: unknown = null;
    try {
      meliSyncResult = await bulkSyncAutoSchedule();
    } catch (meliErr) {
      console.warn('[cron/expire-pending-orders] MeLi sync warning:', meliErr);
    }

    return NextResponse.json(
      {
        ok: true,
        ...wompiResult,
        meliSync: meliSyncResult,
        expireHours: process.env.PENDING_WOMPI_ORDER_EXPIRE_HOURS ?? 48,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[cron/expire-pending-orders]', error);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
