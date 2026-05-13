import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SHIPPING_CONFIG } from "@/config/shippingRates";

/**
 * GET /api/store-settings
 * Public endpoint — returns current shipping config.
 * Falls back to defaults if no DB row exists yet.
 */
export async function GET() {
  try {
    const row = await prisma.storeSettings.findUnique({ where: { id: 1 } });
    const shippingRules = row?.shippingRules ?? DEFAULT_SHIPPING_CONFIG;
    return NextResponse.json({ shippingRules }, { status: 200 });
  } catch (error) {
    console.error("Error loading store settings:", error);
    return NextResponse.json({ shippingRules: DEFAULT_SHIPPING_CONFIG }, { status: 200 });
  }
}
