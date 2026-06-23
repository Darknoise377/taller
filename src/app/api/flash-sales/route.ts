import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const now = new Date();
  const sales = await prisma.flashSale.findMany({
    where: {
      isActive: true,
      startTime: { lte: now },
      OR: [{ endTime: null }, { endTime: { gte: now } }],
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(sales);
}