-- =====================================================================
-- Migration: add_meli_order_real_costs
-- Stores the REAL commission (payments[].marketplace_fee) and REAL seller
-- shipping cost (shipment.order_cost) MeLi charged per order, instead of
-- re-estimating them with a flat fixed cost + a manually-picked listing type.
-- =====================================================================

ALTER TABLE "MeliOrder"
  ADD COLUMN IF NOT EXISTS "realCommission"   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "realShippingCost" DOUBLE PRECISION;
