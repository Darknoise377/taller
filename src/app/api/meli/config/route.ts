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
    id: 1, markupPercent: 18, fixedCostCOP: 3500,
    defaultListingType: 'gold_special', categoryMap: {},
  });
}

export async function PUT(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json() as {
    markupPercent?: number;
    fixedCostCOP?: number;
    defaultListingType?: string;
    categoryMap?: Record<string, string>;
  };

  const { markupPercent, fixedCostCOP, defaultListingType, categoryMap } = body;

  // Validate
  if (markupPercent !== undefined && (markupPercent < 0 || markupPercent >= 100)) {
    return NextResponse.json({ error: 'markupPercent debe estar entre 0 y 99' }, { status: 400 });
  }

  const config = await prisma.meliConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      markupPercent: markupPercent ?? 18,
      fixedCostCOP: fixedCostCOP ?? 3500,
      defaultListingType: defaultListingType ?? 'gold_special',
      categoryMap: categoryMap ?? {},
    },
    update: {
      ...(markupPercent !== undefined && { markupPercent }),
      ...(fixedCostCOP !== undefined && { fixedCostCOP }),
      ...(defaultListingType !== undefined && { defaultListingType }),
      ...(categoryMap !== undefined && { categoryMap }),
    },
  });

  return NextResponse.json(config);
}
