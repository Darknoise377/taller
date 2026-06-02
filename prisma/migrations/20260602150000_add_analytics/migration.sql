-- ─────────────────────────────────────────────────────────────────
-- 📊 Analytics: SearchLog + PageView
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE "SearchLog" (
    "id"        SERIAL        NOT NULL,
    "query"     TEXT          NOT NULL,
    "results"   INTEGER       NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PageView" (
    "id"        SERIAL        NOT NULL,
    "path"      TEXT          NOT NULL,
    "label"     TEXT,
    "createdAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- Índices para queries rápidas en el panel admin
CREATE INDEX "SearchLog_query_idx"     ON "SearchLog"("query");
CREATE INDEX "SearchLog_createdAt_idx" ON "SearchLog"("createdAt");
CREATE INDEX "PageView_path_idx"       ON "PageView"("path");
CREATE INDEX "PageView_createdAt_idx"  ON "PageView"("createdAt");
