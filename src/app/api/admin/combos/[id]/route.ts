import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/config/admin';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try { await verifyAdminToken(token); return true; } catch { return false; }
}

// GET /api/admin/combos/[id] — get single combo (admin)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const combo = await prisma.combo.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { id: true, name: true, price: true, imageUrl: true, stock: true } } } },
        surpriseGift: true,
      },
    });
    if (!combo) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    return NextResponse.json(combo);
  } catch (err) {
    console.error('[GET /api/admin/combos/[id]]', err);
    return NextResponse.json({ error: 'Error al cargar combo' }, { status: 500 });
  }
}

// PUT /api/admin/combos/[id] — update combo
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json() as {
      name?: string;
      description?: string;
      price?: number;
      originalPrice?: number;
      currency?: string;
      imageUrl?: string;
      images?: string[];
      isActive?: boolean;
      isFeatured?: boolean;
      stock?: number;
      badge?: string;
      expiresAt?: string | null;
      items?: Array<{ productId: string; quantity: number }>;
      surpriseGift?: { hint?: string; giftName: string; giftValue?: number } | null;
    };

    const existing = await prisma.combo.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Combo no encontrado' }, { status: 404 });
    }

    const combo = await prisma.$transaction(async (tx) => {
      // Replace items if provided
      if (body.items !== undefined) {
        await tx.comboItem.deleteMany({ where: { comboId: id } });
      }

      // Replace surpriseGift if provided
      if (body.surpriseGift !== undefined) {
        await tx.surpriseGift.deleteMany({ where: { comboId: id } });
      }

      return tx.combo.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name.trim() } : {}),
          ...(body.description !== undefined ? { description: body.description.trim() } : {}),
          ...(body.price !== undefined ? { price: Number(body.price) } : {}),
          ...(body.originalPrice !== undefined ? { originalPrice: Number(body.originalPrice) } : {}),
          ...(body.currency !== undefined ? { currency: body.currency } : {}),
          ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
          ...(body.images !== undefined ? { images: body.images } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
          ...(body.isFeatured !== undefined ? { isFeatured: body.isFeatured } : {}),
          ...(body.stock !== undefined ? { stock: Number(body.stock) } : {}),
          ...(body.badge !== undefined ? { badge: body.badge } : {}),
          ...(body.expiresAt !== undefined
            ? { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }
            : {}),
          ...(body.items !== undefined
            ? {
                items: {
                  create: body.items.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity ?? 1,
                  })),
                },
              }
            : {}),
          ...(body.surpriseGift
            ? {
                surpriseGift: {
                  create: {
                    hint: body.surpriseGift.hint ?? null,
                    giftName: body.surpriseGift.giftName,
                    giftValue: body.surpriseGift.giftValue ?? null,
                  },
                },
              }
            : {}),
        },
        include: {
          items: { include: { product: { select: { id: true, name: true, price: true } } } },
          surpriseGift: true,
        },
      });
    });

    revalidatePath('/combos');
    revalidatePath(`/combos/${combo.slug}`);
    return NextResponse.json(combo);
  } catch (err) {
    console.error('[PUT /api/admin/combos/[id]]', err);
    return NextResponse.json({ error: 'Error al actualizar combo' }, { status: 500 });
  }
}

// DELETE /api/admin/combos/[id] — delete combo
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const existing = await prisma.combo.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Combo no encontrado' }, { status: 404 });
    }

    await prisma.combo.delete({ where: { id } });
    revalidatePath('/combos');
    revalidatePath(`/combos/${existing.slug}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/admin/combos/[id]]', err);
    return NextResponse.json({ error: 'Error al eliminar combo' }, { status: 500 });
  }
}
