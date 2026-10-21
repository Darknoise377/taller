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

async function getUniqueSlug(baseText: string): Promise<string> {
  const baseSlug = slugify(baseText) || 'combo';
  let slug = `${baseSlug}-copia`;
  let counter = 1;
  while (true) {
    const existing = await prisma.combo.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) {
      return slug;
    }
    counter += 1;
    slug = `${baseSlug}-copia-${counter}`;
  }
}

// POST /api/admin/combos/[id]/duplicate
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const original = await prisma.combo.findUnique({
      where: { id },
      include: {
        items: true,
        surpriseGift: true,
      },
    });

    if (!original) {
      return NextResponse.json({ error: 'Combo no encontrado' }, { status: 404 });
    }

    const newName = `${original.name} (Copia)`;
    const newSlug = await getUniqueSlug(original.slug);

    const duplicated = await prisma.$transaction(async (tx) => {
      return tx.combo.create({
        data: {
          name: newName,
          slug: newSlug,
          description: original.description,
          price: original.price,
          originalPrice: original.originalPrice,
          currency: original.currency,
          imageUrl: original.imageUrl,
          images: original.images,
          isActive: false, // Duplicates start inactive for safety
          isFeatured: false,
          stock: original.stock,
          soldCount: 0,
          badge: original.badge ? `${original.badge}` : null,
          expiresAt: original.expiresAt,
          items: {
            create: original.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
            })),
          },
          ...(original.surpriseGift
            ? {
                surpriseGift: {
                  create: {
                    hint: original.surpriseGift.hint,
                    giftName: original.surpriseGift.giftName,
                    giftValue: original.surpriseGift.giftValue,
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
    return NextResponse.json(duplicated, { status: 201 });
  } catch (err) {
    console.error('[POST /api/admin/combos/[id]/duplicate]', err);
    return NextResponse.json({ error: 'Error al duplicar el combo' }, { status: 500 });
  }
}
