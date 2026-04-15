import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = {
      code: String(body.code ?? "").trim().toUpperCase(),
      discount: Number(body.discount),
      description: String(body.description ?? "").trim(),
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    };

    if (!data.code || !data.description || !Number.isFinite(data.discount) || data.discount <= 0 || data.discount > 100) {
      return NextResponse.json({ error: "Datos de promoción inválidos. El descuento debe ser entre 1 y 100." }, { status: 400 });
    }

    const promo = await prisma.promotion.create({ data });
    return NextResponse.json(promo);
  } catch (error) {
    console.error("Error creando promoción:", error);
    return NextResponse.json({ error: "Error creando promoción" }, { status: 500 });
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
      code?: string;
      discount?: number;
      description?: string;
      isActive?: boolean;
      expiresAt?: Date | null;
    } = {};

    if (body.code !== undefined) data.code = String(body.code).trim().toUpperCase();
    if (body.discount !== undefined) {
      const discount = Number(body.discount);
      if (!Number.isFinite(discount) || discount <= 0 || discount > 100) {
        return NextResponse.json({ error: "Descuento inválido. Debe ser entre 1 y 100." }, { status: 400 });
      }
      data.discount = discount;
    }
    if (body.description !== undefined) data.description = String(body.description).trim();
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
    if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

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
