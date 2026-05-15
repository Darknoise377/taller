// src/app/api/auth/reset-password/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/hash";
import { rateLimit } from "@/lib/rateLimit";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export async function POST(req: Request) {
  try {
    const limit = await rateLimit(req, {
      keyPrefix: "reset-password",
      windowMs: 15 * 60 * 1000,
      max: 10,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta más tarde." },
        { status: 429 },
      );
    }

    const body = (await req.json()) as { token?: string; password?: string };
    const token = body.token?.trim() ?? "";
    const password = body.password ?? "";

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token y contraseña son requeridos" },
        { status: 400 },
      );
    }

    if (!PASSWORD_REGEX.test(password)) {
      return NextResponse.json(
        {
          error:
            "La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número",
        },
        { status: 400 },
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "El enlace es inválido o ya expiró. Solicita uno nuevo." },
        { status: 400 },
      );
    }

    const hashed = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
