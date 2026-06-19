import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
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

    const sale = await prisma.flashSale.update({
      where: { id },
      data: {
        name,
        description,
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
    console.error('Error updating flash sale:', err);
    return NextResponse.json(
      { error: 'No se pudo actualizar la oferta' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    await prisma.flashSale.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting flash sale:', err);
    return NextResponse.json(
      { error: 'No se pudo eliminar la oferta' },
      { status: 500 }
    );
  }
}