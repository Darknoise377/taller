/**
 * GET /api/meli/auth
 * Redirects the admin to the MeLi OAuth authorization page.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { buildAuthUrl } from '@/lib/meli/auth';
import { verifyAdminToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/config/admin';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  await verifyAdminToken(token);

  try {
    const url = buildAuthUrl();
    return NextResponse.redirect(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Configuration error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
