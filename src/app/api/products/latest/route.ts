// src/app/api/products/latest/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Definimos un tipo para el objeto que esperamos de la consulta
type ProductForSlider = {
  // CORREGIDO: El 'id' del producto es un número, no un string.
  id: number; 
  name: string;
  description: string | null;
  images: string[];
};

export async function GET() {
  try {
    const latestProducts: ProductForSlider[] = await prisma.product.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 3,
      select: {
        id: true,
        name: true,
        description: true,
        images: true,
      },
    });

    if (!latestProducts) {
      return NextResponse.json([]);
    }

    // Ahora 'p' coincide perfectamente con el tipo de 'latestProducts'
    const productsWithImages = latestProducts.filter(
      (p) => p.images && p.images.length > 0
    );

    return NextResponse.json(productsWithImages);
  } catch (error) {
    console.error("Error fetching latest products:", error);
    // Fallback: permite renderizar la Home aunque la BD no esté accesible.
    return NextResponse.json([]);
  }
}