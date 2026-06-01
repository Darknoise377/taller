import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_SEASONAL_CAMPAIGN,
  DEFAULT_SHIPPING_CONFIG,
  type ShippingConfig,
} from "@/config/shippingRates";

/**
 * GET /api/store-settings
 * Public endpoint — returns current shipping config.
 * Falls back to defaults if no DB row exists yet.
 */
export async function GET() {
  try {
    const row = await prisma.storeSettings.findUnique({ where: { id: 1 } });
    const raw = (row?.shippingRules ?? DEFAULT_SHIPPING_CONFIG) as Partial<ShippingConfig>;
    const shippingRules: ShippingConfig = {
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

    return NextResponse.json(
      { shippingRules, seasonalCampaign: shippingRules.seasonalCampaign },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error loading store settings:", error);
    return NextResponse.json(
      {
        shippingRules: DEFAULT_SHIPPING_CONFIG,
        seasonalCampaign: DEFAULT_SHIPPING_CONFIG.seasonalCampaign,
      },
      { status: 200 },
    );
  }
}
