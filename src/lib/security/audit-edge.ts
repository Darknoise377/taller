/**
 * Edge-safe audit logging — no Prisma, no Node.js APIs.
 * Used by middleware (Edge Runtime). Logs are captured by Vercel's
 * log drain / observability. The Node.js version (audit.ts) persists to DB.
 */

type AuditAction = "ACCESS_DENIED" | "SENSITIVE_ACTION" | "LOGIN_FAILED" | "LOGIN_SUCCESS";

export function auditSecurityEventEdge(input: {
  action: AuditAction;
  path?: string;
  method?: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  reason?: string;
  ip?: string;
  userAgent?: string;
}): void {
  console.info(
    "[SECURITY_AUDIT]",
    JSON.stringify({ ...input, timestamp: new Date().toISOString() })
  );
}
