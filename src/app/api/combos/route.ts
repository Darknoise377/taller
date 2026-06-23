import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/combos — list active combos (public)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get('featured') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50);

    const combos = await prisma.combo.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
        ...(featured ? { isFeatured: true } : {}),
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
                currency: true,
                imageUrl: true,
                images: true,
                category: true,
                stock: true,
                sku: true,
              },
            },
          },
        },
        surpriseGift: {
          select: {
            id: true,
            hint: true,
            giftValue: true,
            // giftName is intentionally excluded from public listing
          },
        },
      },
      orderBy: [{ isFeatured: 'desc' }, { soldCount: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    return NextResponse.json(combos, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    console.error('[GET /api/combos]', err);
    return NextResponse.json({ error: 'Error al cargar combos' }, { status: 500 });
  }
}
