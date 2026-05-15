// src/app/api/cuenta/profile/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyCustomerToken } from "@/lib/auth/jwt";
import { CUSTOMER_COOKIE_NAME } from "@/config/admin";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifyCustomerToken(token);
  } catch {
    return null;
  }
}

// GET /api/cuenta/profile — devuelve datos del perfil
export async function GET() {
  const payload = await getAuthUser();
  if (!payload) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.uid },
    select: { id: true, email: true, name: true, phone: true, address: true, city: true, department: true, postalCode: true, cedula: true, createdAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  return NextResponse.json(user);
}

// PUT /api/cuenta/profile — actualiza nombre y teléfono
export async function PUT(req: Request) {
  const payload = await getAuthUser();
  if (!payload) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = (await req.json()) as { name?: string; phone?: string; address?: string; city?: string; department?: string; postalCode?: string; cedula?: string };
  const name = body.name?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const address = body.address?.trim() ?? "";
  const city = body.city?.trim() ?? "";
  const department = body.department?.trim() ?? "";
  const postalCode = body.postalCode?.trim() ?? "";
  const cedula = body.cedula?.trim() ?? "";

  if (!name) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: payload.uid },
    data: {
      name: name || null,
      phone: phone || null,
      address: address || null,
      city: city || null,
      department: department || null,
      postalCode: postalCode || null,
      cedula: cedula || null,
    },
    select: { id: true, email: true, name: true, phone: true, address: true, city: true, department: true, postalCode: true, cedula: true },
  });

  return NextResponse.json(updated);
}
