/**
 * GET /api/meli/config   – returns current MeliConfig row
 * PUT /api/meli/config   – updates markupPercent, fixedCostCOP, defaultListingType, categoryMap
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/config/admin';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try { await verifyAdminToken(token); return true; } catch { return null; }
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const config = await prisma.meliConfig.findUnique({ where: { id: 1 } });
  return NextResponse.json(config ?? {
    id: 1, extraMarginPercent: 0, fixedCostCOP: 3500,
    defaultListingType: 'gold_special', categoryMap: {},
  });
}

export async function PUT(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json() as {
    extraMarginPercent?: number;
    fixedCostCOP?: number;
    defaultListingType?: string;
    freeInstallments?: number;
    categoryMap?: Record<string, string>;
  };

  const { extraMarginPercent, fixedCostCOP, defaultListingType, freeInstallments, categoryMap } = body;

  // Validate: extra margin can be 0 (none) up to some reasonable max
  if (extraMarginPercent !== undefined && (extraMarginPercent < 0 || extraMarginPercent >= 80)) {
    return NextResponse.json({ error: 'extraMarginPercent debe estar entre 0 y 79' }, { status: 400 });
  }

  const config = await prisma.meliConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      extraMarginPercent: extraMarginPercent ?? 0,
      fixedCostCOP: fixedCostCOP ?? 3500,
      defaultListingType: defaultListingType ?? 'gold_special',
      freeInstallments: freeInstallments ?? 3,
      categoryMap: categoryMap ?? {},
    },
    update: {
      ...(extraMarginPercent !== undefined && { extraMarginPercent }),
      ...(fixedCostCOP !== undefined && { fixedCostCOP }),
      ...(defaultListingType !== undefined && { defaultListingType }),
      ...(freeInstallments !== undefined && { freeInstallments }),
      ...(categoryMap !== undefined && { categoryMap }),
    },
  });

  return NextResponse.json(config);
}
