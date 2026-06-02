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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// GET /api/admin/combos — list all combos (admin, includes inactive)
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const combos = await prisma.combo.findMany({
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true, imageUrl: true, stock: true },
            },
          },
        },
        surpriseGift: true, // Admin sees giftName too
        _count: { select: { orderCombos: true } },
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(combos);
  } catch (err) {
    console.error('[GET /api/admin/combos]', err);
    return NextResponse.json({ error: 'Error al cargar combos' }, { status: 500 });
  }
}

// POST /api/admin/combos — create a new combo
export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json() as {
      name: string;
      slug?: string;
      description: string;
      price: number;
      originalPrice: number;
      currency?: string;
      imageUrl?: string;
      images?: string[];
      isActive?: boolean;
      isFeatured?: boolean;
      stock: number;
      badge?: string;
      expiresAt?: string;
      items: Array<{ productId: string; quantity: number }>;
      surpriseGift?: { hint?: string; giftName: string; giftValue?: number };
    };

    if (!body.name || !body.description || !body.price || !body.originalPrice || !body.items?.length) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const slug = body.slug?.trim() || slugify(body.name);

    // Check slug uniqueness
    const existing = await prisma.combo.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: `El slug "${slug}" ya existe` }, { status: 409 });
    }

    const combo = await prisma.combo.create({
      data: {
        name: body.name.trim(),
        slug,
        description: body.description.trim(),
        price: Number(body.price),
        originalPrice: Number(body.originalPrice),
        currency: body.currency ?? 'COP',
        imageUrl: body.imageUrl ?? null,
        images: body.images ?? [],
        isActive: body.isActive ?? true,
        isFeatured: body.isFeatured ?? false,
        stock: Number(body.stock),
        badge: body.badge ?? null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        items: {
          create: body.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity ?? 1,
          })),
        },
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

    revalidatePath('/combos');
    return NextResponse.json(combo, { status: 201 });
  } catch (err) {
    console.error('[POST /api/admin/combos] error:', err);
    return NextResponse.json({ error: 'Error al crear combo' }, { status: 500 });
  }
}
