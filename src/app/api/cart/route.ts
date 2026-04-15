import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/cart
 * Obtiene todos los productos (lectura pública)
 */
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error("❌ Error al obtener productos:", error);
    return NextResponse.json([], { status: 200 });
  }
}

/**
 * PUT /api/cart
 * Sincroniza el carrito del cliente (solo validación, sin persistencia)
 */
export async function PUT(req: Request) {
  try {
    const cartItems = await req.json();

    if (!Array.isArray(cartItems)) {
      return NextResponse.json(
        { message: "El formato del carrito es inválido. Se esperaba un array." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Carrito actualizado correctamente.", count: cartItems.length },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error al actualizar carrito:", error);
    return NextResponse.json(
      { message: "Error interno del servidor al actualizar carrito." },
      { status: 500 }
    );
  }
}
