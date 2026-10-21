import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
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

async function getUniqueSlug(baseText: string, currentId?: string): Promise<string> {
  const baseSlug = slugify(baseText) || 'combo';
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await prisma.combo.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing || (currentId && existing.id === currentId)) {
      return slug;
    }
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
}

// GET /api/admin/combos
export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status') || 'all'; // all | active | inactive | expired | out_of_stock
    const featured = searchParams.get('featured');

    const now = new Date();
    // Build where clause
    const whereClause: Record<string, unknown> = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { badge: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') {
      whereClause.isActive = true;
      whereClause.AND = [
        ...(Array.isArray(whereClause.AND) ? whereClause.AND : []),
        {
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      ];
    } else if (status === 'inactive') {
      whereClause.isActive = false;
    } else if (status === 'expired') {
      whereClause.expiresAt = { lte: now };
    } else if (status === 'out_of_stock') {
      whereClause.stock = { lte: 0 };
    }

    if (featured === 'true') {
      whereClause.isFeatured = true;
    }

    const combos = await prisma.combo.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
                slug: true,
                images: true,
                stock: true,
                category: true,
                sku: true,
              },
            },
          },
        },
        surpriseGift: {
          select: {
            id: true,
            hint: true,
            giftName: true,
            giftValue: true,
          },
        },
        _count: {
          select: {
            orderCombos: true,
          },
        },
      },
      orderBy: [{ isFeatured: 'desc' }, { soldCount: 'desc' }, { createdAt: 'desc' }],
    });

    const mappedCombos = combos.map((c) => {
      const savings = Math.max(0, c.originalPrice - c.price);
      const savingsPercent = c.originalPrice > 0 ? Math.round((savings / c.originalPrice) * 100) : 0;
      const isExpired = c.expiresAt ? new Date(c.expiresAt) <= now : false;

      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        price: c.price,
        originalPrice: c.originalPrice,
        currency: c.currency,
        imageUrl: c.imageUrl,
        images: c.images || [],
        isActive: c.isActive,
        isFeatured: c.isFeatured,
        stock: c.stock,
        soldCount: c.soldCount,
        badge: c.badge,
        expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
        isExpired,
        savings,
        savingsPercent,
        items: c.items,
        surpriseGift: c.surpriseGift,
        _count: c._count,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    });

    return NextResponse.json(mappedCombos);
  } catch (error) {
    console.error('Error al obtener combos (admin):', error);
    return NextResponse.json({ error: 'Error al obtener combos' }, { status: 500 });
  }
}

// POST /api/admin/combos - Create combo
export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
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

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'El nombre del combo es obligatorio' }, { status: 400 });
    }

    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'Debes incluir al menos un producto en el combo' }, { status: 400 });
    }

    const name = body.name.trim();
    const price = Number(body.price ?? 0);
    const originalPrice = Number(body.originalPrice ?? price);
    const stock = Number(body.stock ?? 0);

    // Compute or validate slug
    const finalSlug = await getUniqueSlug(body.slug?.trim() || name);

    // Resolve images
    const images = Array.isArray(body.images) ? body.images.filter(Boolean) : [];
    const imageUrl = body.imageUrl || images[0] || null;

    const combo = await prisma.$transaction(async (tx) => {
      const created = await tx.combo.create({
        data: {
          name,
          slug: finalSlug,
          description: body.description?.trim() || '',
          price,
          originalPrice,
          currency: body.currency || 'COP',
          imageUrl,
          images,
          isActive: body.isActive ?? true,
          isFeatured: body.isFeatured ?? false,
          stock,
          badge: body.badge?.trim() || null,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
          items: {
            create: body.items?.map((item) => ({
              productId: item.productId,
              quantity: Math.max(1, Number(item.quantity) || 1),
            })) ?? [],
          },
          ...(body.surpriseGift && body.surpriseGift.giftName?.trim()
            ? {
                surpriseGift: {
                  create: {
                    giftName: body.surpriseGift.giftName.trim(),
                    hint: body.surpriseGift.hint?.trim() || null,
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
                select: {
                  id: true,
                  name: true,
                  price: true,
                  imageUrl: true,
                  stock: true,
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

      return created;
    });

    revalidatePath('/combos');
    revalidatePath(`/combos/${combo.slug}`);
    revalidatePath('/');

    return NextResponse.json(combo, { status: 201 });
  } catch (err) {
    console.error('[POST /api/admin/combos]', err);
    return NextResponse.json({ error: 'Error al crear el combo' }, { status: 500 });
  }
}
