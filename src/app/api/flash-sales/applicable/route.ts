import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('productId');
  const category = searchParams.get('category');

  const now = new Date();

  // Construir filtro base para ofertas activas
  const baseWhere: {
    isActive: boolean;
    startTime: { lte: Date };
    OR: Array<{ endTime: null } | { endTime: { gte: Date } }>;
    appliesTo?: string;
    targetCategories?: { has: string };
    targetProductIds?: { has: string };
  } = {
    isActive: true,
    startTime: { lte: now },
    OR: [{ endTime: null }, { endTime: { gte: now } }],
  };

  // Optimización: filtrar por applying criterios en la base de datos
  if (productId && category) {
    // Buscar ofertas que apliquen a este producto o categoría
    const sales = await prisma.flashSale.findMany({
      where: {
        ...baseWhere,
        OR: [
          { appliesTo: 'ALL' },
          { AND: { appliesTo: 'CATEGORY', targetCategories: { has: category } } },
          { AND: { appliesTo: 'PRODUCT', targetProductIds: { has: productId } } },
        ],
      },
      select: {
        id: true,
        name: true,
        discount: true,
        mode: true,
        targetPrice: true,
        appliesTo: true,
        targetCategories: true,
        targetProductIds: true,
        startTime: true,
        endTime: true,
        products: {
          select: { productId: true, targetPrice: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Aplicar filtro adicional para FIXED_PRICE (productos específicos)
    const applicable = sales.find((s) => {
      if (s.appliesTo === 'ALL') return true;
      if (s.appliesTo === 'CATEGORY') return s.targetCategories.includes(category);
      if (s.appliesTo === 'PRODUCT') {
        if (s.mode === 'FIXED_PRICE') {
          return s.products.some(fp => fp.productId === productId);
        }
        return s.targetProductIds.includes(productId);
      }
      return false;
    });

    return NextResponse.json(applicable ?? null);
  }

  // Sin filtros específicos, devolver todas las activas
  const sales = await prisma.flashSale.findMany({
    where: baseWhere,
    select: {
      id: true,
      name: true,
      discount: true,
      mode: true,
      targetPrice: true,
      appliesTo: true,
      targetCategories: true,
      targetProductIds: true,
      startTime: true,
      endTime: true,
      products: {
        select: { productId: true, targetPrice: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(sales);
}