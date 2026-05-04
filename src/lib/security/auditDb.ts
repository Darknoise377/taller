import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/config/admin";
import type { AdminRole } from "@/types/auth";

type RequestActor = {
  id: string;
  email: string;
  role: AdminRole;
};

function getCookieValue(cookieHeader: string | null, cookieName: string): string | null {
  if (!cookieHeader) return null;
  const entries = cookieHeader.split(";").map((part) => part.trim());
  const match = entries.find((entry) => entry.startsWith(`${cookieName}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(cookieName.length + 1));
}

export async function getRequestActorFromCookie(request: Request): Promise<RequestActor | null> {
  const cookieHeader = request.headers.get("cookie");
  const token = getCookieValue(cookieHeader, COOKIE_NAME);
  if (!token) return null;

  try {
    const payload = await verifyAdminToken(token);
    return {
      id: payload.uid,
      email: payload.sub,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export async function writeSecurityAuditLog(input: {
  action: "ACCESS_DENIED" | "SENSITIVE_ACTION";
  path: string;
  method: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  reason?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.securityAuditLog.create({
      data: {
        action: input.action,
        path: input.path,
        method: input.method,
        actorId: input.actorId,
        actorEmail: input.actorEmail,
        actorRole: input.actorRole,
        reason: input.reason,
        ip: input.ip,
        userAgent: input.userAgent,
        metadata: input.metadata !== undefined
          ? (input.metadata as Parameters<typeof prisma.securityAuditLog.create>[0]['data']['metadata'])
          : undefined,
      },
    });
  } catch (error) {
    console.error("Error writing security audit log:", error);
  }
}
