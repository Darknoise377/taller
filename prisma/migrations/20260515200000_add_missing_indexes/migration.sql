-- Migration: add_missing_indexes
-- Índices en Product para consultas por categoría y stock
CREATE INDEX IF NOT EXISTS "Product_category_idx" ON "Product"("category");
CREATE INDEX IF NOT EXISTS "Product_stock_idx" ON "Product"("stock");

-- Índices en Order para consultas frecuentes
CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order"("userId");
CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX IF NOT EXISTS "Order_customerEmail_idx" ON "Order"("customerEmail");
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");
