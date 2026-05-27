-- Add images array column to Combo table
ALTER TABLE "Combo" ADD COLUMN IF NOT EXISTS "images" TEXT[] NOT NULL DEFAULT '{}';
