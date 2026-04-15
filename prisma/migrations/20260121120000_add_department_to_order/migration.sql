-- Add optional department field to Order for shipping address completeness
ALTER TABLE "Order" ADD COLUMN "department" TEXT;
