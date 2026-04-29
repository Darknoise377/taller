import { NextResponse } from "next/server";

function isValidCartPayload(value: unknown): boolean {
  if (!Array.isArray(value)) return false;

  return value.every((item) => {
    if (!item || typeof item !== "object") return false;

    const maybeItem = item as {
      quantity?: unknown;
      product?: { id?: unknown };
    };

    return (
      typeof maybeItem.quantity === "number" &&
      maybeItem.quantity > 0 &&
      !!maybeItem.product &&
      typeof maybeItem.product.id === "string"
    );
  });
}

/**
 * GET /api/cart
 * El carrito vive en el cliente; aquí solo devolvemos un fallback vacío.
 */
export async function GET() {
  return NextResponse.json([], { status: 200 });
}

/**
 * PUT /api/cart
 * Valida el carrito del cliente para sincronización ligera.
 */
export async function PUT(req: Request) {
  try {
    const cartItems = await req.json();

    if (!isValidCartPayload(cartItems)) {
      return NextResponse.json(
        { message: "El formato del carrito es inválido." },
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
