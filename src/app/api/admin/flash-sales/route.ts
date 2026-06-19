import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const sales = await prisma.flashSale.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(sales);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      discount,
      startTime,
      endTime,
      isActive,
      appliesTo,
      targetCategories,
      targetProductIds,
    } = body;

    const sale = await prisma.flashSale.create({
      data: {
        name,
        description: description || null,
        discount: Number(discount),
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        isActive,
        appliesTo,
        targetCategories,
        targetProductIds,
      },
    });

    return NextResponse.json(sale);
  } catch (err) {
    console.error('Error creating flash sale:', err);
    return NextResponse.json(
      { error: 'No se pudo crear la oferta' },
      { status: 500 }
    );
  }
}