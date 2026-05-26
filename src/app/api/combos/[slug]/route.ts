import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/combos/[slug] — get combo detail (public)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const combo = await prisma.combo.findUnique({
      where: { slug },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                currency: true,
                imageUrl: true,
                images: true,
                category: true,
                stock: true,
                sku: true,
                brand: true,
              },
            },
          },
        },
        surpriseGift: {
          select: {
            id: true,
            hint: true,
            giftValue: true,
            // giftName is intentionally excluded — revealed only post-purchase
          },
        },
      },
    });

    if (!combo) {
      return NextResponse.json({ error: 'Combo no encontrado' }, { status: 404 });
    }

    if (!combo.isActive) {
      return NextResponse.json({ error: 'Combo no disponible' }, { status: 404 });
    }

    // Check expiry
    if (combo.expiresAt && combo.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Esta oferta ha expirado' }, { status: 410 });
    }

    return NextResponse.json(combo);
  } catch (err) {
    console.error('[GET /api/combos/[slug]]', err);
    return NextResponse.json({ error: 'Error al cargar combo' }, { status: 500 });
  }
}
