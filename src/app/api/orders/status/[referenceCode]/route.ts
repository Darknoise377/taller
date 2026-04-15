import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ referenceCode: string }> }
) {
  try {
    const { referenceCode } = await context.params;
    if (!referenceCode) {
      return NextResponse.json({ message: "Referencia requerida" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { referenceCode },
      select: { referenceCode: true, status: true, updatedAt: true },
    });

    if (!order) {
      return NextResponse.json({ message: "Orden no encontrada" }, { status: 404 });
    }

    return NextResponse.json(order, { status: 200 });
  } catch (error) {
    console.error("Error consultando estado de orden:", error);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
