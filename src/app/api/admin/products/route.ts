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

// GET /api/admin/products — Todos los productos sin límite de paginación (solo admin)
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        currency: true,
        imageUrl: true,
                images: true,
                videoUrl: true,
                sku: true,
        tags: true,
        diagramNumber: true,
        category: true,
        sizes: true,
        colors: true,
        stock: true,
        brand: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
        meliExport: true,
        meliListing: {
          select: {
            meliItemId: true,
            status: true,
            meliPrice: true,
            lastSyncAt: true,
          },
        },
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error al obtener productos (admin):', error);
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
  }
}
