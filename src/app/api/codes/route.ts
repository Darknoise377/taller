import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const sellers = await prisma.seller.findMany();
    const promotions = await prisma.promotion.findMany();

    return NextResponse.json({ sellers, promotions });
  } catch (error) {
    console.error("Error al obtener códigos:", error);
    return NextResponse.json({ error: "Error al obtener códigos" }, { status: 500 });
  }
}
