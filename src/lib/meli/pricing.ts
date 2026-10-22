/**
 * Pricing logic for Mercado Libre channel (MCO — Colombia).
 *
 * MeLi charges a commission % on the final sale price, per listing type.
 * The formula ensures the seller receives the original product price after
 * MeLi deducts its commission and any fixed costs:
 *
 *   meliPrice = ceil((productPrice + fixedCostCOP) / (1 - totalRate/100) / 100) * 100
 *   where totalRate = meliCommission[listingType] + extraMarginPercent
 */
import { prisma } from '@/lib/prisma';

// ─── MeLi Colombia commission rates by listing type ──────────────────────────
export const MELI_COMMISSION_RATES: Record<string, number> = {
  gold_special: 16.5,  // Clásica
  gold_premium: 18.5,  // Premium
  free: 0,             // Gratuita (no fee, but limited visibility)
};

export interface MeliPriceResult {
  meliPrice: number;            // Final rounded price to publish on MeLi
  productPrice: number;         // Original product price (what seller wants to receive)
  listingType: string;          // MeLi listing type used
  meliCommissionRate: number;   // % that MeLi charges on the sale
  meliCommissionAmount: number; // COP amount MeLi keeps
  extraMarginRate: number;      // Additional % seller adds on top
  fixedCostCOP: number;         // Fixed cost per sale (packaging, etc.)
  shippingCost: number;         // Mercado Envíos shipping cost deducted by MeLi (when >= freeShippingThresholdCOP)
  hasFreeShipping: boolean;     // Whether MeLi forces free shipping for buyer
  netToSeller: number;          // COP the seller effectively receives after all deductions
}

/** Load current MeliConfig. Falls back to sensible defaults. */
export async function getMeliConfig() {
  const config = await prisma.meliConfig.findUnique({ where: { id: 1 } });
  return {
    extraMarginPercent: config?.extraMarginPercent ?? 0,
    fixedCostCOP: config?.fixedCostCOP ?? 3500,
    defaultListingType: config?.defaultListingType ?? 'gold_special',
    freeInstallments: config?.freeInstallments ?? 3,
    meliShippingCostCOP: config?.meliShippingCostCOP ?? 10000,
    freeShippingThresholdCOP: config?.freeShippingThresholdCOP ?? 60000,
    categoryMap: (config?.categoryMap ?? {}) as Record<string, string>,
  };
}

/**
 * Calculate MeLi price for a given product price using current config.
 * Optionally pass the listing type to use; falls back to defaultListingType.
 */
export async function calculateMeliPrice(
  productPrice: number,
  listingType?: string,
  forceShipping?: boolean,
): Promise<MeliPriceResult> {
  const config = await getMeliConfig();
  const lt = listingType ?? config.defaultListingType;
  return calculateMeliPriceSync(
    productPrice,
    lt,
    config.extraMarginPercent,
    config.fixedCostCOP,
    config.meliShippingCostCOP,
    config.freeShippingThresholdCOP,
    forceShipping,
  );
}

/** Synchronous version when config values are already loaded. */
export function calculateMeliPriceSync(
  productPrice: number,
  listingType: string,
  extraMarginPercent: number,
  fixedCostCOP: number,
  meliShippingCostCOP = 10000,
  freeShippingThresholdCOP = 60000,
  forceShipping?: boolean,
): MeliPriceResult {
  const meliCommissionRate = MELI_COMMISSION_RATES[listingType] ?? 16.5;
  const totalRate = meliCommissionRate + extraMarginPercent;
  if (totalRate >= 100) throw new Error('totalRate must be < 100');

  // Evaluar si califica para Envío Gratis obligatorio en Mercado Libre Colombia (>= $60.000 COP)
  const rawBase = (productPrice + fixedCostCOP) / (1 - totalRate / 100);
  const needsFreeShipping =
    forceShipping !== undefined
      ? forceShipping
      : rawBase >= freeShippingThresholdCOP || productPrice >= freeShippingThresholdCOP;

  const shippingCost = needsFreeShipping ? meliShippingCostCOP : 0;

  // Gross up: el vendedor recibe productPrice; MeLi retiene totalRate% + flete obligatorio + costo fijo
  const rawPrice = (productPrice + fixedCostCOP + shippingCost) / (1 - totalRate / 100);
  const meliPrice = Math.ceil(rawPrice / 100) * 100;

  const meliCommissionAmount = Math.round((meliPrice * meliCommissionRate) / 100);
  const netToSeller = meliPrice - meliCommissionAmount - fixedCostCOP - shippingCost;

  return {
    meliPrice,
    productPrice,
    listingType,
    meliCommissionRate,
    meliCommissionAmount,
    extraMarginRate: extraMarginPercent,
    fixedCostCOP,
    shippingCost,
    hasFreeShipping: needsFreeShipping,
    netToSeller,
  };
}

/** Preview prices for a list of products without writing to DB. */
export function previewPrices(
  items: { productPrice: number; listingType?: string }[],
  extraMarginPercent: number,
  fixedCostCOP: number,
  defaultListingType = 'gold_special',
): MeliPriceResult[] {
  return items.map(({ productPrice, listingType }) =>
    calculateMeliPriceSync(
      productPrice,
      listingType ?? defaultListingType,
      extraMarginPercent,
      fixedCostCOP,
    ),
  );
}
