import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = {
      name: String(body.name ?? "").trim(),
      code: String(body.code ?? "").trim().toUpperCase(),
      userId: typeof body.userId === "string" ? body.userId : undefined,
    };
    if (!data.name || !data.code) {
      return NextResponse.json({ error: "Datos de vendedor inválidos" }, { status: 400 });
    }
    const seller = await prisma.seller.create({ data });
    return NextResponse.json(seller);
  } catch (error) {
    console.error("Error creando vendedor:", error);
    return NextResponse.json({ error: "Error creando vendedor" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const data: {
      name?: string;
      code?: string;
      userId?: string | null;
    } = {};

    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.code !== undefined) data.code = String(body.code).trim().toUpperCase();
    if (body.userId !== undefined) {
      data.userId = body.userId === null ? null : String(body.userId);
      if (data.userId !== null && typeof data.userId !== 'string') {
        return NextResponse.json({ error: "userId inválido" }, { status: 400 });
      }
    }

    const seller = await prisma.seller.update({
      where: { id },
      data,
    });
    return NextResponse.json(seller);
  } catch (error) {
    console.error("Error actualizando vendedor:", error);
    return NextResponse.json({ error: "Error actualizando vendedor" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }
    await prisma.seller.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error eliminando vendedor:", error);
    return NextResponse.json({ error: "Error eliminando vendedor" }, { status: 500 });
  }
}
