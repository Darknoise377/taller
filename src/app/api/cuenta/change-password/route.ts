// src/app/api/cuenta/change-password/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyCustomerToken } from "@/lib/auth/jwt";
import { hashPassword, verifyPassword } from "@/lib/auth/hash";
import { CUSTOMER_COOKIE_NAME } from "@/config/admin";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let payload;
  try {
    payload = await verifyCustomerToken(token);
  } catch {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const body = (await req.json()) as {
    currentPassword?: string;
    newPassword?: string;
  };
  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Todos los campos son requeridos" },
      { status: 400 },
    );
  }

  if (!PASSWORD_REGEX.test(newPassword)) {
    return NextResponse.json(
      {
        error:
          "La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número",
      },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: payload.uid } });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const valid = await verifyPassword(currentPassword, user.password);
  if (!valid) {
    return NextResponse.json(
      { error: "La contraseña actual es incorrecta" },
      { status: 400 },
    );
  }

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  return NextResponse.json({ ok: true });
}
