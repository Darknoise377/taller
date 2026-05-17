/**
 * POST /api/meli/sync/[productId]
 * Publish or update a single product on MeLi.
 *
 * DELETE /api/meli/sync/[productId]
 * Close the MeLi listing for a product.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { syncProduct, unpublishProduct } from '@/lib/meli/sync';
import { verifyAdminToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/config/admin';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try { await verifyAdminToken(token); return true; } catch { return null; }
}

interface Params { params: Promise<{ productId: string }> }

export async function POST(_req: Request, { params }: Params) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { productId } = await params;
  try {
    const result = await syncProduct(productId);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { productId } = await params;
  try {
    await unpublishProduct(productId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
