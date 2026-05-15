// src/app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { sendPasswordResetEmail } from "@/lib/email/authEmails";
import { getBaseUrl } from "@/lib/site";
import { randomBytes } from "crypto";
import { Role } from "@prisma/client";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Email inválido").max(254),
});

export async function POST(req: Request) {
  try {
    const limit = await rateLimit(req, {
      keyPrefix: "forgot-password",
      windowMs: 15 * 60 * 1000,
      max: 5,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta más tarde." },
        { status: 429 },
      );
    }

    const parseResult = forgotPasswordSchema.safeParse(await req.json());
    if (!parseResult.success) {
      // Responder OK siempre para no revelar si el email existe
      return NextResponse.json({ ok: true, message: "Si el correo está registrado, recibirás instrucciones en breve." });
    }
    const email = parseResult.data.email.toLowerCase();

    // Buscar usuario CUSTOMER (no revelar si existe o no)
    const user = await prisma.user.findFirst({
      where: { email, role: Role.CUSTOMER },
    });

    if (user) {
      const token = randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: token,
          passwordResetExpires: expires,
        },
      });

      const resetUrl = `${getBaseUrl()}/cuenta/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, user.name ?? null, resetUrl);
    }

    // Siempre responder OK para no revelar si el email existe
    return NextResponse.json({
      ok: true,
      message: "Si el correo está registrado, recibirás instrucciones en breve.",
    });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
