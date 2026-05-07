// src/app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { hashPassword } from "@/lib/auth/hash";
import { signCustomerToken, getCustomerJwtCookieMaxAgeSeconds } from "@/lib/auth/jwt";
import { CUSTOMER_COOKIE_NAME } from "@/config/admin";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const limit = await rateLimit(req, {
      keyPrefix: "customer-register",
      windowMs: 15 * 60 * 1000,
      max: 5,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta más tarde." },
        { status: 429 },
      );
    }

    const body = (await req.json()) as {
      email?: string;
      password?: string;
      name?: string;
    };

    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const name = body.name?.trim() ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Formato de email inválido" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con este email" },
        { status: 409 },
      );
    }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, password: hashed, name: name || null, role: Role.CUSTOMER },
    });

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

    return NextResponse.json(
      { success: true, user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 },
    );
  } catch (error) {
    console.error("[/api/auth/register]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
