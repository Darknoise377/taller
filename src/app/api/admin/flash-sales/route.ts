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

// GET /api/admin/flash-sales — Solo admin
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const sales = await prisma.flashSale.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      products: {
        select: { productId: true, targetPrice: true },
      },
    },
  });
  return NextResponse.json(sales);
}

// POST /api/admin/flash-sales — Crear (Solo admin, con validación)
export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

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
      mode,
      productPrices = [],
    } = body;

    // Validación de entrada
    const trimmedName = String(name ?? '').trim();
    if (!trimmedName) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
    }

    const numDiscount = Number(discount);
    if (!Number.isFinite(numDiscount) || numDiscount <= 0 || numDiscount > 100) {
      return NextResponse.json({ error: 'Descuento debe ser entre 1 y 100' }, { status: 400 });
    }

    const parsedStart = new Date(startTime);
    if (isNaN(parsedStart.getTime())) {
      return NextResponse.json({ error: 'Fecha de inicio inválida' }, { status: 400 });
    }

    const parsedEnd = endTime ? new Date(endTime) : null;
    if (parsedEnd && isNaN(parsedEnd.getTime())) {
      return NextResponse.json({ error: 'Fecha de fin inválida' }, { status: 400 });
    }
    if (parsedEnd && parsedEnd <= parsedStart) {
      return NextResponse.json({ error: 'La fecha de fin debe ser posterior al inicio' }, { status: 400 });
    }

    const safeAppliesTo = ['ALL', 'CATEGORY', 'PRODUCT'].includes(appliesTo) ? appliesTo : 'ALL';
    const safeMode = ['REAL', 'ANCHOR', 'FIXED_PRICE'].includes(mode) ? mode : 'ANCHOR';

    // FIXED_PRICE: validar productPrices
    if (mode === 'FIXED_PRICE') {
      if (!Array.isArray(productPrices) || productPrices.length === 0) {
        return NextResponse.json({ error: 'FIXED_PRICE requiere productos con precios' }, { status: 400 });
      }
      for (const item of productPrices) {
        if (!item.productId || !item.targetPrice || !Number.isFinite(Number(item.targetPrice))) {
          return NextResponse.json({ error: 'Cada producto debe tener targetPrice válido' }, { status: 400 });
        }
      }
    }

    const sale = await prisma.flashSale.create({
      data: {
        name: trimmedName,
        description: description?.trim() || null,
        discount: numDiscount,
        startTime: parsedStart,
        endTime: parsedEnd,
        isActive: isActive ?? true,
        appliesTo: safeAppliesTo,
        targetCategories: safeAppliesTo === 'CATEGORY' && Array.isArray(targetCategories)
          ? targetCategories.map(String)
          : [],
        targetProductIds: (safeAppliesTo === 'PRODUCT' && Array.isArray(targetProductIds))
          ? targetProductIds.map(String)
          : (mode === 'FIXED_PRICE' && Array.isArray(productPrices) && productPrices.length > 0
              ? productPrices.map((p: { productId: string }) => String(p.productId))
              : []),
        mode: safeMode,
        targetPrice: null,
        // FIXED_PRICE: crear productos individuales
        products: mode === 'FIXED_PRICE' && Array.isArray(productPrices) && productPrices.length > 0
          ? {
              create: productPrices.map((p: { productId: string; targetPrice: number }) => ({
                productId: String(p.productId),
                targetPrice: Number(p.targetPrice),
              })),
            }
          : undefined,
      },
      include: {
        products: {
          select: { productId: true, targetPrice: true },
        },
      },
    });

    return NextResponse.json(sale);
  } catch (err) {
    console.error('Error creating flash sale:', err);
    return NextResponse.json({ error: 'No se pudo crear la oferta' }, { status: 500 });
  }
}