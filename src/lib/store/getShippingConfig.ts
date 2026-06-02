import { prisma } from '@/lib/prisma';
import {
  DEFAULT_SEASONAL_CAMPAIGN,
  DEFAULT_SHIPPING_CONFIG,
  type ShippingConfig,
} from '@/config/shippingRates';

/** Loads shipping rules from StoreSettings with safe defaults. */
export async function getShippingConfig(): Promise<ShippingConfig> {
  const row = await prisma.storeSettings.findUnique({ where: { id: 1 } });
  const raw = (row?.shippingRules ?? DEFAULT_SHIPPING_CONFIG) as Partial<ShippingConfig>;

  return {
    freeShippingAll: raw.freeShippingAll ?? DEFAULT_SHIPPING_CONFIG.freeShippingAll,
    freeShippingThreshold:
      raw.freeShippingThreshold ?? DEFAULT_SHIPPING_CONFIG.freeShippingThreshold,
    contraentregaSurcharge:
      raw.contraentregaSurcharge ?? DEFAULT_SHIPPING_CONFIG.contraentregaSurcharge,
    regions:
      Array.isArray(raw.regions) && raw.regions.length > 0
        ? raw.regions
        : DEFAULT_SHIPPING_CONFIG.regions,
    seasonalCampaign: {
      ...DEFAULT_SEASONAL_CAMPAIGN,
      ...(raw.seasonalCampaign ?? {}),
    },
  };
}
