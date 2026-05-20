-- Add brand column to Product table
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "brand" TEXT;
