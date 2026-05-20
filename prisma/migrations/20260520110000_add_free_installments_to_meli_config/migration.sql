-- Add freeInstallments column to MeliConfig table
ALTER TABLE "MeliConfig" ADD COLUMN IF NOT EXISTS "freeInstallments" INTEGER NOT NULL DEFAULT 3;
