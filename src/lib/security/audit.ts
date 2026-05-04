import type { AdminRole } from "@/types/auth";

type AuditAction = "ACCESS_DENIED" | "SENSITIVE_ACTION";

export function auditSecurityEvent(input: {
  action: AuditAction;
  path: string;
  method: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: AdminRole;
  reason?: string;
  ip?: string;
  userAgent?: string;
}) {
  const payload = {
    timestamp: new Date().toISOString(),
    action: input.action,
    path: input.path,
    method: input.method,
    actorId: input.actorId ?? null,
    actorEmail: input.actorEmail ?? null,
    actorRole: input.actorRole ?? null,
    reason: input.reason ?? null,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
  };

  console.info("[SECURITY_AUDIT]", JSON.stringify(payload));
}
