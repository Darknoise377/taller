-- Migration: add verifiedPurchase column to Review table
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "verifiedPurchase" BOOLEAN NOT NULL DEFAULT false;
