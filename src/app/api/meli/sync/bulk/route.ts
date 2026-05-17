/**
 * POST /api/meli/sync/bulk
 * Sync all products with meliExport = true.
 * Long-running — returns immediately with a summary.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { bulkSyncProducts } from '@/lib/meli/sync';
import { verifyAdminToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/config/admin';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  await verifyAdminToken(token);

  const result = await bulkSyncProducts();
  return NextResponse.json(result);
}
