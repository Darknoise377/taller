import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/hash";
import { Role } from "@prisma/client";
import { getRequestActorFromCookie, writeSecurityAuditLog } from "@/lib/security/auditDb";

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getRequestActorFromCookie(req);
    const requestIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    const { id } = await context.params;
    const userId = String(id);

    if (!userId) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const data = await req.json();
    const { email, password, name, role } = data;

    // Validate password strength if provided
    if (password && (typeof password !== 'string' || password.length < 8)) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }

    // Validate role is a known value in Prisma enum
    if (role && !Object.values(Role).includes(role as Role)) {
      return NextResponse.json(
        { error: "Rol inválido" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        email,
        name,
        role,
        ...(password ? { password: await hashPassword(password) } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await writeSecurityAuditLog({
      action: "SENSITIVE_ACTION",
      path: `/api/users/${userId}`,
      method: "PUT",
      actorId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      reason: "Updated user",
      ip: requestIp,
      userAgent,
      metadata: { targetUserId: updatedUser.id, targetRole: updatedUser.role },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json(
      { error: "Error al actualizar usuario" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getRequestActorFromCookie(req);
    const requestIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    const { id } = await context.params;
    const userId = String(id);

    if (!userId) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id: userId } });

    await writeSecurityAuditLog({
      action: "SENSITIVE_ACTION",
      path: `/api/users/${userId}`,
      method: "DELETE",
      actorId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      reason: "Deleted user",
      ip: requestIp,
      userAgent,
      metadata: { targetUserId: userId },
    });

    return NextResponse.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    return NextResponse.json(
      { error: "Error al eliminar usuario" },
      { status: 500 }
    );
  }
}

