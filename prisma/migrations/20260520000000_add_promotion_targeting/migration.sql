-- Add promotion targeting fields: appliesTo, targetCategories, targetProductIds
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "appliesTo" TEXT NOT NULL DEFAULT 'ALL';
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "targetCategories" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "targetProductIds" TEXT[] NOT NULL DEFAULT '{}';
