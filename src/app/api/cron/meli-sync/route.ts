import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { bulkSyncAutoSchedule } from '@/lib/meli/sync';
import { verifyAdminToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/config/admin';

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (secret && auth === `Bearer ${secret}`) {
    return true;
  }

  // Also allow execution from admin dashboard session
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (token) {
      await verifyAdminToken(token);
      return true;
    }
  } catch {
    // not valid admin cookie
  }

  // Development environment fallback
  return process.env.NODE_ENV !== 'production';
}

/**
 * GET or POST /api/cron/meli-sync
 * Vercel Cron or Admin trigger:
 * - Syncs pending & out-of-sync products with Mercado Libre
 * - Syncs pending combos with Mercado Libre
 * - Automatically pulls and processes recent MeLi orders, deducting local stock
 * - Records execution metrics and timestamp
 */
export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const result = await bulkSyncAutoSchedule();
    return NextResponse.json(
      {
        ok: true,
        ...result,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[cron/meli-sync]', error);
    return NextResponse.json(
      { message: 'Error interno en sincronización MeLi', error: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
