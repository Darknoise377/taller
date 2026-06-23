import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Prisma } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const appliesTo = ['ALL', 'CATEGORY', 'PRODUCT'].includes(body.appliesTo) ? body.appliesTo : 'ALL';
    const data = {
      code: String(body.code ?? '').trim().toUpperCase(),
      discount: Number(body.discount),
      description: String(body.description ?? '').trim(),
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      appliesTo,
      targetCategories: Array.isArray(body.targetCategories) ? body.targetCategories.map(String) : [],
      targetProductIds: Array.isArray(body.targetProductIds) ? body.targetProductIds.map(String) : [],
      mode: ['REAL', 'ANCHOR', 'FIXED_PRICE'].includes(body.mode) ? body.mode : 'ANCHOR',
      targetPrice: body.mode === 'FIXED_PRICE' ? Number(body.targetPrice) : null,
    };

    if (!data.code || !data.description || !Number.isFinite(data.discount) || data.discount <= 0 || data.discount > 100) {
      return NextResponse.json({ error: 'Datos de promoción inválidos. El descuento debe ser entre 1 y 100.' }, { status: 400 });
    }

    const promo = await prisma.promotion.create({ data });
    return NextResponse.json(promo);
  } catch (error) {
    console.error('Error creando promoción:', error);
    return NextResponse.json({ error: 'Error creando promoción' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const data: Prisma.PromotionUpdateInput = {};

    if (body.code !== undefined) data.code = String(body.code).trim().toUpperCase();
    if (body.discount !== undefined) {
      const discount = Number(body.discount);
      if (!Number.isFinite(discount) || discount <= 0 || discount > 100) {
        return NextResponse.json({ error: 'Descuento inválido. Debe ser entre 1 y 100.' }, { status: 400 });
      }
      data.discount = discount;
    }
    if (body.description !== undefined) data.description = String(body.description).trim();
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
    if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (['ALL', 'CATEGORY', 'PRODUCT'].includes(body.appliesTo)) data.appliesTo = body.appliesTo;
    if (Array.isArray(body.targetCategories)) data.targetCategories = body.targetCategories.map(String);
    if (Array.isArray(body.targetProductIds)) data.targetProductIds = body.targetProductIds.map(String);
    if (['REAL', 'ANCHOR', 'FIXED_PRICE'].includes(body.mode)) data.mode = body.mode;
    if (body.targetPrice !== undefined) data.targetPrice = body.targetPrice ? Number(body.targetPrice) : null;

    const promo = await prisma.promotion.update({
      where: { id },
      data,
    });
    return NextResponse.json(promo);
  } catch (error) {
    console.error("Error actualizando promoción:", error);
    return NextResponse.json({ error: "Error actualizando promoción" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }
    await prisma.promotion.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error eliminando promoción:", error);
    return NextResponse.json({ error: "Error eliminando promoción" }, { status: 500 });
  }
}

// Endpoint para validar cupón y verificar stacking
export async function PATCH(req: Request) {
  try {
    const { code, productIds, categories } = await req.json();
    if (!code) {
      return NextResponse.json({ error: "Código requerido" }, { status: 400 });
    }

    const promo = await prisma.promotion.findFirst({
      where: { code: code.toUpperCase(), isActive: true },
    });

    if (!promo) {
      return NextResponse.json({ error: "Cupón inválido o inactivo" }, { status: 404 });
    }

    // Verificar stacking: no permitir si hay FlashSale activa para los mismos productos
    const now = new Date();
    const activeFlashSales = await prisma.flashSale.findMany({
      where: {
        isActive: true,
        startTime: { lte: now },
        OR: [{ endTime: null }, { endTime: { gte: now } }],
      },
    });

    const hasFlashSaleConflict = activeFlashSales.some((sale) => {
      if (sale.appliesTo === 'ALL') return true;
      if (sale.appliesTo === 'CATEGORY' && categories?.some?.((c: string) => sale.targetCategories.includes(c))) return true;
      if (sale.appliesTo === 'PRODUCT' && productIds?.some?.((p: string) => sale.targetProductIds.includes(p))) return true;
      return false;
    });

    if (hasFlashSaleConflict) {
      return NextResponse.json({ error: "No se puede aplicar cupón: producto(s) con oferta Flash Sale activa" }, { status: 409 });
    }

    return NextResponse.json(promo);
  } catch (error) {
    console.error("Error validando promoción:", error);
    return NextResponse.json({ error: "Error validando cupón" }, { status: 500 });
  }
}
