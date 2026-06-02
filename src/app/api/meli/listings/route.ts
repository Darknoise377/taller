/**
 * GET /api/meli/listings?refresh=1
 * Admin: catálogo con estado local y (opcional) estado en vivo desde MeLi.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/config/admin';
import { loadAdminMeliListings, summarizeListings } from '@/lib/meli/adminListings';

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

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const refresh = req.nextUrl.searchParams.get('refresh') === '1';

  try {
    const items = await loadAdminMeliListings({ refreshLive: refresh });
    const summary = summarizeListings(items);
    return NextResponse.json({ items, summary, refreshed: refresh });
  } catch (err) {
    console.error('[meli/listings]', err);
    const message = err instanceof Error ? err.message : 'Error al cargar publicaciones';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
