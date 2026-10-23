/**
 * POST /api/meli/sync/combo/bulk
 * Bulk sync all combos with meliExport = true.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { bulkSyncCombos, bulkSyncPendingCombos } from '@/lib/meli/sync';
import { verifyAdminToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/config/admin';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    await verifyAdminToken(token);
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let onlyPending = false;
  try {
    const body = await req.json();
    onlyPending = Boolean(body?.onlyPending);
  } catch {
    // empty body → sync all
  }

  const result = onlyPending
    ? await bulkSyncPendingCombos()
    : await bulkSyncCombos();

  return NextResponse.json({ ...result, onlyPending });
}
