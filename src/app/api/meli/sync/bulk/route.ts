/**
 * POST /api/meli/sync/bulk
 * Sync all products with meliExport = true.
 * Long-running — returns immediately with a summary.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { bulkSyncPendingProducts, bulkSyncProducts } from '@/lib/meli/sync';
import { verifyAdminToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/config/admin';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  await verifyAdminToken(token);

  let onlyPending = false;
  try {
    const body = await req.json();
    onlyPending = Boolean(body?.onlyPending);
  } catch {
    // empty body → sync all
  }

  const result = onlyPending
    ? await bulkSyncPendingProducts()
    : await bulkSyncProducts();
  return NextResponse.json({ ...result, onlyPending });
}
