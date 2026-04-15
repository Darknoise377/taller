// src/app/api/admin/login/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/hash";
import { getJwtCookieMaxAgeSeconds, signAdminToken } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/config/admin";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const limit = rateLimit(req, {
      keyPrefix: "admin-login",
      windowMs: 15 * 60 * 1000,
      max: 10,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta más tarde." },
        {
          status: 429,
          headers: {
            "Retry-After": String(limit.retryAfterSeconds ?? 60),
            "X-RateLimit-Limit": String(limit.limit),
            "X-RateLimit-Remaining": String(limit.remaining),
            "X-RateLimit-Reset": String(Math.ceil(limit.resetAt / 1000)),
          },
        }
      );
    }

    const body = (await req.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
    }

    // 1️⃣ Buscar usuario por email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });

    // 2️⃣ Verificar contraseña
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });

    // 2.1️⃣ Verificar rol (solo ADMIN/SUPERADMIN pueden acceder al panel)
    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // 3️⃣ Generar token con datos del usuario
    const token = await signAdminToken({
      email: user.email,
      userId: user.id,
      role: user.role,
      name: user.name,
    });

    // 4️⃣ Crear cookie de sesión segura
    const cookieStore = await cookies();
    const maxAgeSeconds = getJwtCookieMaxAgeSeconds();
    cookieStore.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: maxAgeSeconds,
      // Admin session: preferimos strict para reducir CSRF al mínimo.
      sameSite: "strict",
    });

    // 5️⃣ Devolver respuesta exitosa
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
