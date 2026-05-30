-- Migration: add slug field to Product for SEO-friendly URLs
-- Date: 2026-05-30

-- 1. Add nullable slug column
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- 2. Backfill existing products with sanitized name + 6-char id prefix
--    Example: "Filtro de Aceite" → "filtro-de-aceite-550e84"
UPDATE "Product"
SET "slug" = TRIM(
  BOTH '-' FROM
  REGEXP_REPLACE(
    LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9 ]', ' ', 'g')),
    ' +', '-', 'g'
  )
) || '-' || LOWER(LEFT(REPLACE(id::text, '-', ''), 6))
WHERE "slug" IS NULL;

-- 3. Create unique index (enforces uniqueness without making column NOT NULL yet)
CREATE UNIQUE INDEX IF NOT EXISTS "Product_slug_key" ON "Product"("slug");
