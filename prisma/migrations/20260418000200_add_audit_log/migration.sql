-- CreateTable
CREATE TABLE "AuditLog" (
    "id"          SERIAL NOT NULL,
    "timestamp"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action"      TEXT NOT NULL,
    "path"        TEXT,
    "method"      TEXT,
    "actorId"     TEXT,
    "actorEmail"  TEXT,
    "actorRole"   TEXT,
    "reason"      TEXT,
    "ip"          TEXT,
    "userAgent"   TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_actorEmail_idx" ON "AuditLog"("actorEmail");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
