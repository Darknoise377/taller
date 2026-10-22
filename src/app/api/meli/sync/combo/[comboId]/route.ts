/**
 * POST /api/meli/sync/combo/[comboId]
 * Publish or update a single combo on MeLi.
 *
 * DELETE /api/meli/sync/combo/[comboId]
 * Close the MeLi listing for a combo.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { syncCombo, unpublishCombo } from '@/lib/meli/sync';
import { verifyAdminToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/config/admin';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    await verifyAdminToken(token);
    return true;
  } catch {
    return null;
  }
}

interface Params {
  params: Promise<{ comboId: string }>;
}

export async function POST(_req: Request, { params }: Params) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { comboId } = await params;
  try {
    const result = await syncCombo(comboId);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { comboId } = await params;
  try {
    await unpublishCombo(comboId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
