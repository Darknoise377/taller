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
      productPrices,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = String(name).trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (discount !== undefined) updateData.discount = Number(discount);
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = endTime ? new Date(endTime) : null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const safeMode = ['REAL', 'ANCHOR', 'FIXED_PRICE'].includes(mode) ? mode : 'ANCHOR';
    updateData.mode = safeMode;

    if (appliesTo !== undefined) {
      updateData.appliesTo = appliesTo;
      updateData.targetCategories = appliesTo === 'CATEGORY' && Array.isArray(targetCategories)
        ? targetCategories.map(String)
        : [];
      updateData.targetProductIds = appliesTo === 'PRODUCT' && Array.isArray(targetProductIds)
        ? targetProductIds.map(String)
        : [];
    }

    // FIXED_PRICE: manejar productos individuales
    if (mode === 'FIXED_PRICE' && Array.isArray(productPrices)) {
      updateData.targetPrice = null;
      // Eliminar productos anteriores y crear nuevos
      await prisma.flashSaleProduct.deleteMany({ where: { flashSaleId: id } });
      updateData.products = {
        create: productPrices.map((p: { productId: string; targetPrice: number }) => ({
          productId: String(p.productId),
          targetPrice: Number(p.targetPrice),
        })),
      };
    } else if (mode !== 'FIXED_PRICE') {
      updateData.targetPrice = null;
      await prisma.flashSaleProduct.deleteMany({ where: { flashSaleId: id } });
    }

    const sale = await prisma.flashSale.update({
      where: { id },
      data: updateData,
      include: {
        products: {
          select: { productId: true, targetPrice: true },
        },
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