import { prisma } from "@/lib/prisma";
import type { AdminRole } from "@/types/auth";

export type AuditAction = "ACCESS_DENIED" | "SENSITIVE_ACTION" | "LOGIN_FAILED" | "LOGIN_SUCCESS";

export function auditSecurityEvent(input: {
  action: AuditAction;
  path?: string;
  method?: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: AdminRole;
  reason?: string;
  ip?: string;
  userAgent?: string;
}) {
  const data = {
    action: input.action,
    path: input.path ?? null,
    method: input.method ?? null,
    actorId: input.actorId ?? null,
    actorEmail: input.actorEmail ?? null,
    actorRole: input.actorRole ?? null,
    reason: input.reason ?? null,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
  };

  // Fire-and-forget: persist in DB without blocking the request
  prisma.auditLog
    .create({ data })
    .catch((err: unknown) => {
      // Fallback to console so no audit event is silently lost
      console.info("[SECURITY_AUDIT]", JSON.stringify({ ...data, timestamp: new Date().toISOString() }));
      console.error("[SECURITY_AUDIT] DB write failed:", err);
    });
}
