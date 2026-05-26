-- Migration: add_combos
-- Creates Combo, ComboItem, SurpriseGift, OrderCombo tables

CREATE TABLE "Combo" (
  "id"            TEXT         NOT NULL,
  "name"          TEXT         NOT NULL,
  "slug"          TEXT         NOT NULL,
  "description"   TEXT         NOT NULL,
  "price"         DOUBLE PRECISION NOT NULL,
  "originalPrice" DOUBLE PRECISION NOT NULL,
  "currency"      TEXT         NOT NULL DEFAULT 'COP',
  "imageUrl"      TEXT,
  "isActive"      BOOLEAN      NOT NULL DEFAULT true,
  "isFeatured"    BOOLEAN      NOT NULL DEFAULT false,
  "stock"         INTEGER      NOT NULL DEFAULT 0,
  "soldCount"     INTEGER      NOT NULL DEFAULT 0,
  "badge"         TEXT,
  "expiresAt"     TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Combo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Combo_slug_key" ON "Combo"("slug");
CREATE INDEX "Combo_isActive_isFeatured_idx" ON "Combo"("isActive", "isFeatured");
CREATE INDEX "Combo_slug_idx" ON "Combo"("slug");

CREATE TABLE "ComboItem" (
  "id"        SERIAL       NOT NULL,
  "comboId"   TEXT         NOT NULL,
  "productId" TEXT         NOT NULL,
  "quantity"  INTEGER      NOT NULL DEFAULT 1,
  CONSTRAINT "ComboItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ComboItem_comboId_fkey"   FOREIGN KEY ("comboId")   REFERENCES "Combo"("id")   ON DELETE CASCADE,
  CONSTRAINT "ComboItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT
);

CREATE TABLE "SurpriseGift" (
  "id"        SERIAL       NOT NULL,
  "comboId"   TEXT         NOT NULL,
  "hint"      TEXT,
  "giftName"  TEXT         NOT NULL,
  "giftValue" DOUBLE PRECISION,
  CONSTRAINT "SurpriseGift_pkey"     PRIMARY KEY ("id"),
  CONSTRAINT "SurpriseGift_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "Combo"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "SurpriseGift_comboId_key" ON "SurpriseGift"("comboId");

CREATE TABLE "OrderCombo" (
  "id"        SERIAL       NOT NULL,
  "orderId"   INTEGER      NOT NULL,
  "comboId"   TEXT         NOT NULL,
  "quantity"  INTEGER      NOT NULL DEFAULT 1,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "OrderCombo_pkey"     PRIMARY KEY ("id"),
  CONSTRAINT "OrderCombo_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT,
  CONSTRAINT "OrderCombo_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "Combo"("id") ON DELETE RESTRICT
);
