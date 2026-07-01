import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/config/admin';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try { await verifyAdminToken(token); return true; } catch { return null; }
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const combos = await prisma.combo.findMany({
      where: {
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
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
                slug: true,
                images: true,
              },
            },
          },
        },
        surpriseGift: {
          select: {
            hint: true,
            giftValue: true,
          },
        },
      },
      orderBy: [{ isFeatured: 'desc' }, { soldCount: 'desc' }, { createdAt: 'desc' }],
    });

    const mappedCombos = combos.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      price: c.price,
      originalPrice: c.originalPrice,
      imageUrl: c.imageUrl,
      images: c.images,
      isActive: c.isActive,
      items: c.items,
    }));

    return NextResponse.json(mappedCombos);
  } catch (error) {
    console.error('Error al obtener combos (admin):', error);
    return NextResponse.json({ error: 'Error al obtener combos' }, { status: 500 });
  }
}