/**
 * GET  /api/meli/status   – returns MeLi connection info
 * DELETE /api/meli/status – disconnects (deletes stored tokens)
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getMeliConnectionStatus, disconnectMeli } from '@/lib/meli/auth';
import { verifyAdminToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/config/admin';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) throw new Response('No autorizado', { status: 401 });
  await verifyAdminToken(token);
}

export async function GET() {
  try {
    await requireAdmin();
    const status = await getMeliConnectionStatus();
    return NextResponse.json(status);
  } catch (err) {
    if (err instanceof Response) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await requireAdmin();
    await disconnectMeli();
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
