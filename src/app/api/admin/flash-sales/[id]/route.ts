import { NextRequest, NextResponse } from 'next/server';
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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
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
      mode,
      targetPrice,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = String(name).trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (discount !== undefined) updateData.discount = Number(discount);
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = endTime ? new Date(endTime) : null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (appliesTo !== undefined) updateData.appliesTo = appliesTo;
    if (targetCategories !== undefined) updateData.targetCategories = appliesTo === 'CATEGORY' ? targetCategories : [];
    if (targetProductIds !== undefined) updateData.targetProductIds = appliesTo === 'PRODUCT' ? targetProductIds : [];
    if (mode !== undefined) updateData.mode = ['REAL', 'ANCHOR', 'FIXED_PRICE'].includes(mode) ? mode : 'ANCHOR';
    if (targetPrice !== undefined) updateData.targetPrice = mode === 'FIXED_PRICE' ? Number(targetPrice) : null;

    const sale = await prisma.flashSale.update({
      where: { id },
      data: updateData,
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
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