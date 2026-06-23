import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('productId');
  const category = searchParams.get('category');

  const now = new Date();
  const sales = await prisma.flashSale.findMany({
    where: {
      isActive: true,
      startTime: { lte: now },
      OR: [{ endTime: null }, { endTime: { gte: now } }],
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
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!productId) {
    return NextResponse.json(sales);
  }

  const applicable = sales.find((s) => {
    if (s.appliesTo === 'ALL') return true;
    if (s.appliesTo === 'CATEGORY' && category && s.targetCategories.includes(category)) return true;
    if (s.appliesTo === 'PRODUCT' && s.targetProductIds.includes(productId)) return true;
    return false;
  });

  return NextResponse.json(applicable ?? null);
}