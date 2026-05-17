-- =====================================================================
-- Migration: add_meli_integration
-- Adds Mercado Libre OAuth tokens, config, listings and order tracking.
-- =====================================================================

-- 1. New PaymentMethod enum value
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'MERCADO_LIBRE';

-- 2. New MeliListingStatus enum
DO $$ BEGIN
  CREATE TYPE "MeliListingStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED', 'UNDER_REVIEW', 'ERROR');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. MeLi fields on Product table
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "meliExport"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "meliListingType" TEXT    NOT NULL DEFAULT 'gold_special';

-- 4. MeliToken singleton table
CREATE TABLE IF NOT EXISTS "MeliToken" (
  "id"           INTEGER      NOT NULL DEFAULT 1,
  "accessToken"  TEXT         NOT NULL,
  "refreshToken" TEXT         NOT NULL,
  "expiresAt"    TIMESTAMPTZ  NOT NULL,
  "meliUserId"   TEXT         NOT NULL,
  "nickname"     TEXT,
  "siteId"       TEXT         NOT NULL DEFAULT 'MCO',
  "createdAt"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "MeliToken_pkey" PRIMARY KEY ("id")
);

-- 5. MeliConfig singleton table
CREATE TABLE IF NOT EXISTS "MeliConfig" (
  "id"                 INTEGER     NOT NULL DEFAULT 1,
  "extraMarginPercent" FLOAT       NOT NULL DEFAULT 0,
  "fixedCostCOP"       FLOAT       NOT NULL DEFAULT 3500,
  "defaultListingType" TEXT        NOT NULL DEFAULT 'gold_special',
  "categoryMap"        JSONB       NOT NULL DEFAULT '{}',
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "MeliConfig_pkey" PRIMARY KEY ("id")
);

-- Seed default config row
INSERT INTO "MeliConfig" ("id", "extraMarginPercent", "fixedCostCOP", "defaultListingType", "categoryMap", "updatedAt")
VALUES (1, 0, 3500, 'gold_special', '{}', NOW())
ON CONFLICT ("id") DO NOTHING;

-- 6. MeliListing table (product ↔ MeLi item mapping)
CREATE TABLE IF NOT EXISTS "MeliListing" (
  "id"         SERIAL                   NOT NULL,
  "productId"  TEXT                     NOT NULL,
  "meliItemId" TEXT                     NOT NULL,
  "status"     "MeliListingStatus"      NOT NULL DEFAULT 'ACTIVE',
  "meliPrice"  FLOAT                    NOT NULL,
  "lastSyncAt" TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  "createdAt"  TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  CONSTRAINT "MeliListing_pkey"       PRIMARY KEY ("id"),
  CONSTRAINT "MeliListing_productId_key" UNIQUE ("productId"),
  CONSTRAINT "MeliListing_meliItemId_key" UNIQUE ("meliItemId"),
  CONSTRAINT "MeliListing_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "MeliListing_meliItemId_idx" ON "MeliListing"("meliItemId");

-- 7. MeliOrder table (orders that originated from MeLi)
CREATE TABLE IF NOT EXISTS "MeliOrder" (
  "id"          SERIAL      NOT NULL,
  "meliOrderId" TEXT        NOT NULL,
  "orderId"     INTEGER,
  "rawPayload"  JSONB       NOT NULL,
  "status"      TEXT        NOT NULL,
  "shipmentId"  TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "MeliOrder_pkey"         PRIMARY KEY ("id"),
  CONSTRAINT "MeliOrder_meliOrderId_key" UNIQUE ("meliOrderId"),
  CONSTRAINT "MeliOrder_orderId_key"  UNIQUE ("orderId"),
  CONSTRAINT "MeliOrder_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "MeliOrder_meliOrderId_idx" ON "MeliOrder"("meliOrderId");
