-- =====================================================================
-- Migration: add_meli_listing_category
-- Tracks the MeLi category each listing was published under, so admins
-- can see where a product actually landed without querying MeLi manually.
-- =====================================================================

ALTER TABLE "MeliListing"
  ADD COLUMN IF NOT EXISTS "meliCategoryId"   TEXT,
  ADD COLUMN IF NOT EXISTS "meliCategoryName" TEXT,
  ADD COLUMN IF NOT EXISTS "meliCategoryPath" TEXT;
