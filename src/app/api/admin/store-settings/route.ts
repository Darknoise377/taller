import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME } from "@/config/admin";
import { verifyAdminToken } from "@/lib/auth";
import type { ShippingConfig } from "@/config/shippingRates";

/**
 * PUT /api/admin/store-settings
 * Saves shipping rules. Requires valid admin JWT.
 */
export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await verifyAdminToken(token);

    const body = await req.json() as { shipping_rules: ShippingConfig };
    const rules = body?.shipping_rules;

    if (!rules || typeof rules !== "object") {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    // Basic validation
    if (typeof rules.freeShippingThreshold !== "number" || rules.freeShippingThreshold < 0) {
      return NextResponse.json({ error: "Monto mínimo inválido" }, { status: 400 });
    }
    if (typeof rules.contraentregaSurcharge !== "number" || rules.contraentregaSurcharge < 0) {
      return NextResponse.json({ error: "Recargo contraentrega inválido" }, { status: 400 });
    }
    if (!Array.isArray(rules.regions) || rules.regions.length === 0) {
      return NextResponse.json({ error: "Regiones inválidas" }, { status: 400 });
    }

    await prisma.storeSettings.upsert({
      where: { id: 1 },
      create: { id: 1, shippingRules: rules as object },
      update: { shippingRules: rules as object },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error saving store settings:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
