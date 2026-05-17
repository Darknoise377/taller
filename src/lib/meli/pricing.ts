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
  netToSeller: number;          // COP the seller effectively receives after all deductions
}

/** Load current MeliConfig. Falls back to sensible defaults. */
export async function getMeliConfig() {
  const config = await prisma.meliConfig.findUnique({ where: { id: 1 } });
  return {
    extraMarginPercent: config?.extraMarginPercent ?? 0,
    fixedCostCOP: config?.fixedCostCOP ?? 3500,
    defaultListingType: config?.defaultListingType ?? 'gold_special',
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
): Promise<MeliPriceResult> {
  const config = await getMeliConfig();
  const lt = listingType ?? config.defaultListingType;
  return calculateMeliPriceSync(productPrice, lt, config.extraMarginPercent, config.fixedCostCOP);
}

/** Synchronous version when config values are already loaded. */
export function calculateMeliPriceSync(
  productPrice: number,
  listingType: string,
  extraMarginPercent: number,
  fixedCostCOP: number,
): MeliPriceResult {
  const meliCommissionRate = MELI_COMMISSION_RATES[listingType] ?? 16.5;
  const totalRate = meliCommissionRate + extraMarginPercent;
  if (totalRate >= 100) throw new Error('totalRate must be < 100');

  // Gross up: seller receives productPrice; MeLi keeps totalRate% of final price
  const rawPrice = (productPrice + fixedCostCOP) / (1 - totalRate / 100);
  const meliPrice = Math.ceil(rawPrice / 100) * 100;

  const meliCommissionAmount = Math.round(meliPrice * meliCommissionRate / 100);
  const netToSeller = meliPrice - meliCommissionAmount - fixedCostCOP;

  return {
    meliPrice,
    productPrice,
    listingType,
    meliCommissionRate,
    meliCommissionAmount,
    extraMarginRate: extraMarginPercent,
    fixedCostCOP,
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
