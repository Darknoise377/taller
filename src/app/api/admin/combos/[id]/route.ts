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
  try {
    await verifyAdminToken(token);
    return true;
  } catch {
    return false;
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

async function getUniqueSlug(baseText: string, currentId: string): Promise<string> {
  const baseSlug = slugify(baseText) || 'combo';
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await prisma.combo.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing || existing.id === currentId) {
      return slug;
    }
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
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
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
                images: true,
                stock: true,
                category: true,
                sku: true,
              },
            },
          },
        },
        surpriseGift: true,
        _count: {
          select: { orderCombos: true },
        },
      },
    });

    if (!combo) return NextResponse.json({ error: 'Combo no encontrado' }, { status: 404 });
    return NextResponse.json(combo);
  } catch (err) {
    console.error('[GET /api/admin/combos/[id]]', err);
    return NextResponse.json({ error: 'Error al cargar combo' }, { status: 500 });
  }
}

// PATCH /api/admin/combos/[id] — fast toggle / partial update
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json() as {
      isActive?: boolean;
      isFeatured?: boolean;
      stock?: number;
      badge?: string | null;
    };

    const existing = await prisma.combo.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Combo no encontrado' }, { status: 404 });
    }

    const updated = await prisma.combo.update({
      where: { id },
      data: {
        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
        ...(body.isFeatured !== undefined ? { isFeatured: Boolean(body.isFeatured) } : {}),
        ...(body.stock !== undefined ? { stock: Math.max(0, Number(body.stock)) } : {}),
        ...(body.badge !== undefined ? { badge: body.badge?.trim() || null } : {}),
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true, imageUrl: true, stock: true },
            },
          },
        },
        surpriseGift: true,
        _count: {
          select: { orderCombos: true },
        },
      },
    });

    revalidatePath('/combos');
    revalidatePath(`/combos/${existing.slug}`);
    revalidatePath('/');

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PATCH /api/admin/combos/[id]]', err);
    return NextResponse.json({ error: 'Error al actualizar combo' }, { status: 500 });
  }
}

// PUT /api/admin/combos/[id] — update full combo
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
      slug?: string;
      description?: string;
      price?: number;
      originalPrice?: number;
      currency?: string;
      imageUrl?: string | null;
      images?: string[];
      isActive?: boolean;
      isFeatured?: boolean;
      stock?: number;
      badge?: string | null;
      expiresAt?: string | null;
      items?: Array<{ productId: string; quantity: number }>;
      surpriseGift?: { hint?: string | null; giftName: string; giftValue?: number | null } | null;
    };

    const existing = await prisma.combo.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Combo no encontrado' }, { status: 404 });
    }

    let nextSlug = existing.slug;
    if (body.slug && body.slug.trim() !== existing.slug) {
      nextSlug = await getUniqueSlug(body.slug.trim(), id);
    } else if (body.name && body.name.trim() !== existing.name && !body.slug) {
      nextSlug = await getUniqueSlug(body.name.trim(), id);
    }

    const images = Array.isArray(body.images) ? body.images.filter(Boolean) : existing.images;
    const imageUrl = body.imageUrl !== undefined ? (body.imageUrl || images[0] || null) : existing.imageUrl;

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
          slug: nextSlug,
          ...(body.name !== undefined ? { name: body.name.trim() } : {}),
          ...(body.description !== undefined ? { description: body.description.trim() } : {}),
          ...(body.price !== undefined ? { price: Number(body.price) } : {}),
          ...(body.originalPrice !== undefined ? { originalPrice: Number(body.originalPrice) } : {}),
          ...(body.currency !== undefined ? { currency: body.currency } : {}),
          imageUrl,
          images,
          ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
          ...(body.isFeatured !== undefined ? { isFeatured: Boolean(body.isFeatured) } : {}),
          ...(body.stock !== undefined ? { stock: Math.max(0, Number(body.stock)) } : {}),
          ...(body.badge !== undefined ? { badge: body.badge?.trim() || null } : {}),
          ...(body.expiresAt !== undefined
            ? { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }
            : {}),
          ...(body.items !== undefined
            ? {
                items: {
                  create: body.items.map((item) => ({
                    productId: item.productId,
                    quantity: Math.max(1, Number(item.quantity) || 1),
                  })),
                },
              }
            : {}),
          ...(body.surpriseGift && body.surpriseGift.giftName?.trim()
            ? {
                surpriseGift: {
                  create: {
                    hint: body.surpriseGift.hint?.trim() || null,
                    giftName: body.surpriseGift.giftName.trim(),
                    giftValue: body.surpriseGift.giftValue ? Number(body.surpriseGift.giftValue) : null,
                  },
                },
              }
            : {}),
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, price: true, imageUrl: true, stock: true },
              },
            },
          },
          surpriseGift: true,
          _count: {
            select: { orderCombos: true },
          },
        },
      });
    });

    revalidatePath('/combos');
    revalidatePath(`/combos/${existing.slug}`);
    if (existing.slug !== combo.slug) {
      revalidatePath(`/combos/${combo.slug}`);
    }
    revalidatePath('/');

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
    revalidatePath('/');
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/admin/combos/[id]]', err);
    return NextResponse.json({ error: 'Error al eliminar combo' }, { status: 500 });
  }
}
