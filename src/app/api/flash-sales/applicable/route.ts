import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('productId');
  const category = searchParams.get('category');

  const now = new Date();

  // Construir filtro base para ofertas activas
  const baseWhere = {
    isActive: true,
    startTime: { lte: now },
    OR: [{ endTime: null }, { endTime: { gte: now } }],
  };

  if (productId && category) {
    // Obtener todas las ofertas activas y filtrar en JS para soportar FIXED_PRICE
    const sales = await prisma.flashSale.findMany({
      where: {
        ...baseWhere,
        OR: [
          { appliesTo: 'ALL' },
          { appliesTo: 'CATEGORY', targetCategories: { has: category } },
          { appliesTo: 'PRODUCT' },
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

    // Aplicar filtro final: verificar que el producto realmente aplica
    const applicable = sales.find((s) => {
      if (s.appliesTo === 'ALL') return true;
      if (s.appliesTo === 'CATEGORY') return s.targetCategories.includes(category);
      if (s.appliesTo === 'PRODUCT') {
        // Para FIXED_PRICE, verificar en la relación products
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