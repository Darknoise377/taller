// src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { verifyPassword } from "@/lib/auth/hash";
import { signCustomerToken, getCustomerJwtCookieMaxAgeSeconds } from "@/lib/auth/jwt";
import { CUSTOMER_COOKIE_NAME } from "@/config/admin";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const limit = rateLimit(req, {
      keyPrefix: "customer-login",
      windowMs: 15 * 60 * 1000,
      max: 10,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta más tarde." },
        { status: 429 },
      );
    }

    const body = (await req.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    // Solo usuarios con rol CUSTOMER pueden usar este endpoint
    if (user.role !== Role.CUSTOMER) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const token = await signCustomerToken({ email: user.email, userId: user.id, name: user.name });
    const cookieStore = await cookies();
    cookieStore.set({
      name: CUSTOMER_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: getCustomerJwtCookieMaxAgeSeconds(),
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("[/api/auth/login]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
