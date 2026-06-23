import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface ValidatedItem {
  id: string;
  category: string;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const itemsParam = searchParams.get("items"); // JSON array of {id, category}

    if (!code) {
      return NextResponse.json(
        { error: "Código requerido" },
        { status: 400 }
      );
    }

    // Parse cart items for flash sale conflict check
    const items: ValidatedItem[] = itemsParam ? JSON.parse(decodeURIComponent(itemsParam)) : [];

    // Check if it's a seller code
    const seller = await prisma.seller.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (seller) {
      return NextResponse.json({
        type: "seller",
        data: seller,
      });
    }

    // Check if it's a promotion code
    const promo = await prisma.promotion.findFirst({
      where: { code: code.toUpperCase(), isActive: true },
      select: {
        code: true,
        discount: true,
        description: true,
        mode: true,
        targetPrice: true,
        targetCategories: true,
        targetProductIds: true,
        appliesTo: true,
        expiresAt: true,
      },
    });

    if (promo) {
      // Check for FlashSale conflicts
      const now = new Date();
      const activeFlashSales = await prisma.flashSale.findMany({
        where: {
          isActive: true,
          startTime: { lte: now },
          OR: [{ endTime: null }, { endTime: { gte: now } }],
        },
        select: { appliesTo: true, targetCategories: true, targetProductIds: true },
      });

      // Check if any cart item has an active flash sale
      for (const item of items) {
        const hasConflict = activeFlashSales.some((sale) => {
          if (sale.appliesTo === 'ALL') return true;
          if (sale.appliesTo === 'CATEGORY' && sale.targetCategories?.includes(item.category)) return true;
          if (sale.appliesTo === 'PRODUCT' && sale.targetProductIds?.includes(item.id)) return true;
          return false;
        });
        if (hasConflict) {
          return NextResponse.json(
            { error: "No se puede aplicar cupón: producto(s) con oferta Flash Sale activa" },
            { status: 409 }
          );
        }
      }

      return NextResponse.json({
        type: "promotion",
        data: promo,
      });
    }

    return NextResponse.json(
      { error: "Código no encontrado" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error validating code:", error);
    return NextResponse.json(
      { error: "Error validando código" },
      { status: 500 }
    );
  }
}