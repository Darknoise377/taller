/**
 * Pricing logic for Mercado Libre channel.
 *
 * Formula:
 *   meliPrice = (basePrice + fixedCostCOP) / (1 - markupPercent / 100)
 *
 * Rounds up to the nearest 100 COP for clean display prices.
 */
import { prisma } from '@/lib/prisma';

export interface MeliPriceResult {
  meliPrice: number;     // final price to publish on MeLi
  basePrice: number;     // original price from DB
  markupApplied: number; // % used
  fixedCost: number;     // COP fixed cost used
}

/** Load current MeliConfig. Falls back to sensible defaults. */
export async function getMeliConfig() {
  const config = await prisma.meliConfig.findUnique({ where: { id: 1 } });
  return {
    markupPercent: config?.markupPercent ?? 18,
    fixedCostCOP: config?.fixedCostCOP ?? 3500,
    defaultListingType: config?.defaultListingType ?? 'gold_special',
    categoryMap: (config?.categoryMap ?? {}) as Record<string, string>,
  };
}

/** Calculate MeLi price for a given base price using current config. */
export async function calculateMeliPrice(basePriceCOP: number): Promise<MeliPriceResult> {
  const { markupPercent, fixedCostCOP } = await getMeliConfig();
  return calculateMeliPriceSync(basePriceCOP, markupPercent, fixedCostCOP);
}

/** Synchronous version when config is already loaded. */
export function calculateMeliPriceSync(
  basePriceCOP: number,
  markupPercent: number,
  fixedCostCOP: number,
): MeliPriceResult {
  if (markupPercent >= 100) throw new Error('markupPercent must be < 100');

  const rawPrice = (basePriceCOP + fixedCostCOP) / (1 - markupPercent / 100);
  // Round up to nearest 100 for cleaner pricing on MeLi
  const meliPrice = Math.ceil(rawPrice / 100) * 100;

  return {
    meliPrice,
    basePrice: basePriceCOP,
    markupApplied: markupPercent,
    fixedCost: fixedCostCOP,
  };
}

/** Preview prices for multiple base prices without writing to DB. */
export function previewPrices(
  items: { basePrice: number }[],
  markupPercent: number,
  fixedCostCOP: number,
): { basePrice: number; meliPrice: number }[] {
  return items.map(({ basePrice }) => {
    const { meliPrice } = calculateMeliPriceSync(basePrice, markupPercent, fixedCostCOP);
    return { basePrice, meliPrice };
  });
}
