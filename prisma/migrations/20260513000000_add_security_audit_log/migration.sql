-- CreateTable
CREATE TABLE IF NOT EXISTS "SecurityAuditLog" (
    "id"         SERIAL NOT NULL,
    "action"     TEXT NOT NULL,
    "path"       TEXT NOT NULL,
    "method"     TEXT NOT NULL,
    "actorId"    TEXT,
    "actorEmail" TEXT,
    "actorRole"  TEXT,
    "reason"     TEXT,
    "ip"         TEXT,
    "userAgent"  TEXT,
    "metadata"   JSONB,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SecurityAuditLog_createdAt_idx" ON "SecurityAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SecurityAuditLog_action_idx" ON "SecurityAuditLog"("action");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SecurityAuditLog_actorEmail_idx" ON "SecurityAuditLog"("actorEmail");
