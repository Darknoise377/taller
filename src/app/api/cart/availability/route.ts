// src/app/api/cart/availability/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';

/**
 * GET /api/cart/availability?items=productId1:qty1,productId2:qty2
 * Returns real-time stock availability for the given cart items.
 */
export async function GET(req: Request) {
  try {
    const limiter = await rateLimit(req, { keyPrefix: 'cart-avail', windowMs: 60_000, max: 60 });
    if (!limiter.ok) {
      return NextResponse.json({ message: 'Demasiadas solicitudes' }, { status: 429 });
    }

    const url = new URL(req.url);
    const itemsParam = url.searchParams.get('items') ?? '';

    if (!itemsParam.trim()) {
      return NextResponse.json({ available: true, items: [] });
    }

    // Parse "id1:qty1,id2:qty2"
    const parsed = itemsParam
      .split(',')
      .map((s) => {
        const [id, qtyStr] = s.split(':');
        const qty = parseInt(qtyStr ?? '0', 10);
        return { id: (id ?? '').trim(), qty };
      })
      .filter((i) => i.id.length > 0 && Number.isInteger(i.qty) && i.qty > 0 && i.qty <= 1000);

    if (parsed.length === 0) {
      return NextResponse.json({ available: true, items: [] });
    }

    const productIds = parsed.map((i) => i.id);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, stock: true, name: true },
    });

    const items = parsed.map(({ id, qty }) => {
      const p = dbProducts.find((d) => d.id === id);
      return {
        productId: id,
        name: p?.name ?? '',
        requested: qty,
        inStock: p?.stock ?? 0,
        available: (p?.stock ?? 0) >= qty,
      };
    });

    return NextResponse.json({ available: items.every((i) => i.available), items });
  } catch (error) {
    console.error('Error checking cart availability:', error);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
