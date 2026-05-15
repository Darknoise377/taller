// src/app/api/cuenta/profile/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyCustomerToken } from "@/lib/auth/jwt";
import { CUSTOMER_COOKIE_NAME } from "@/config/admin";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(200),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  city: z.string().trim().max(200).optional().or(z.literal("")),
  department: z.string().trim().max(200).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  cedula: z.string().trim().max(30).optional().or(z.literal("")),
});

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

  const parseResult = updateProfileSchema.safeParse(await req.json());
  if (!parseResult.success) {
    const error = parseResult.error.issues[0]?.message ?? "Datos inválidos";
    return NextResponse.json({ error }, { status: 400 });
  }
  const { name, phone, address, city, department, postalCode, cedula } = parseResult.data;

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
