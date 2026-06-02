-- Desglose de envío y control de devolución de inventario
ALTER TABLE "Order" ADD COLUMN "shippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "stockRestoredAt" TIMESTAMP(3);

CREATE INDEX "Order_status_paymentMethod_createdAt_idx" ON "Order"("status", "paymentMethod", "createdAt");
