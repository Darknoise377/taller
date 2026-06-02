import { NextRequest, NextResponse } from 'next/server';
import { expireStalePendingWompiOrders } from '@/lib/orders/expirePendingOrders';

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
 * Vercel Cron (or manual): cancel stale WOMPI PENDING orders and restore stock.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const result = await expireStalePendingWompiOrders();
    return NextResponse.json(
      {
        ok: true,
        ...result,
        expireHours: process.env.PENDING_WOMPI_ORDER_EXPIRE_HOURS ?? 48,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[cron/expire-pending-orders]', error);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
