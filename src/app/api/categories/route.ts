// src/app/api/categories/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProductCategoryLabel } from "@/constants/productCategories";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      select: {
        category: true,
        imageUrl: true,
      },
    });

    // Mapeo único de categoría → imagen y conteo
    const categoriesMap = new Map<string, { image: string; count: number }>();
    for (const p of products) {
      if (!p.category) continue;

      const current = categoriesMap.get(p.category);
      categoriesMap.set(p.category, {
        image: current?.image || p.imageUrl || "/images/placeholder.png",
        count: (current?.count ?? 0) + 1,
      });
    }

    const categories = Array.from(categoriesMap, ([slug, meta]) => ({
      id: slug,
      slug,
      name: getProductCategoryLabel(slug),
      image: meta.image,
      count: meta.count,
    }));

    return NextResponse.json(categories);
  } catch (err) {
    console.error("Error al obtener categorías:", err);
    // Fallback: permite que la UI cargue aunque la BD no esté disponible.
    return NextResponse.json([], { status: 200 });
  }
}
