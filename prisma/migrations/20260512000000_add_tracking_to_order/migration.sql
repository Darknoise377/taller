-- Migration: add trackingNumber and trackingUrl to Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingNumber" text;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingUrl" text;
