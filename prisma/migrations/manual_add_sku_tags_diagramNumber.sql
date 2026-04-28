-- Manual SQL to add sku, tags and diagramNumber to Product table
-- Run this SQL against your Postgres database (use psql, DBeaver, or another client)

BEGIN;

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sku" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::text[];
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "diagramNumber" TEXT;

-- Ensure uniqueness for SKU when provided (Postgres allows multiple NULLs in unique indexes)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'Product_sku_unique'
    ) THEN
        CREATE UNIQUE INDEX "Product_sku_unique" ON "Product" ("sku");
    END IF;
END$$;

COMMIT;
