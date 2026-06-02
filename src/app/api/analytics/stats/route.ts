import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/config/admin';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await verifyAdminToken(token);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const [topSearches, topPages, recentSearches] = await Promise.all([
    // Top 20 búsquedas agrupadas por query (últimos 30 días)
    prisma.$queryRaw<{ query: string; count: bigint }[]>`
      SELECT query, COUNT(*) AS count
      FROM "SearchLog"
      WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY query
      ORDER BY count DESC
      LIMIT 20
    `,
    // Top 20 páginas visitadas (últimos 30 días)
    prisma.$queryRaw<{ path: string; label: string | null; count: bigint }[]>`
      SELECT path, MAX(label) AS label, COUNT(*) AS count
      FROM "PageView"
      WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY path
      ORDER BY count DESC
      LIMIT 20
    `,
    // Últimas 50 búsquedas
    prisma.searchLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, query: true, results: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    topSearches: topSearches.map((r) => ({ query: r.query, count: Number(r.count) })),
    topPages: topPages.map((r) => ({ path: r.path, label: r.label, count: Number(r.count) })),
    recentSearches,
  });
}
