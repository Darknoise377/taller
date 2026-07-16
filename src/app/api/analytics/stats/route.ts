import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/config/admin';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';

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

function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const today = new Date(now.toDateString());

  const [
    topSearches,
    topPages,
    recentSearches,
    trafficDaily,
    trafficWeekly,
    trafficMonthly,
    todaySearches,
    searchesCurrent,
    searchesPrevious,
    uniqueVisitorsCurrent,
    uniqueVisitorsPrevious,
    todayVisitors,
  ] = await Promise.all([
    // Top 20 búsquedas agrupadas por query (últimos 30 días)
    prisma.searchLog.groupBy({
      by: ['query'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: { query: true },
      orderBy: { _count: { query: 'desc' } },
      take: 20,
    }),
    // Top 20 páginas visitadas (últimos 30 días)
    prisma.pageView.groupBy({
      by: ['path'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: { path: true },
      orderBy: { _count: { path: 'desc' } },
      take: 20,
    }),
    // Últimas 50 búsquedas
    prisma.searchLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, query: true, results: true, createdAt: true },
    }),
    // Tráfico diario (últimos 7 días)
    prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "SearchLog"
      WHERE "createdAt" >= NOW() - INTERVAL '7 days'
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,
    // Tráfico semanal (últimos 4 semanas)
    prisma.$queryRaw<Array<{ week: string; count: bigint }>>`
      SELECT TO_CHAR(DATE_TRUNC('week', "createdAt"), 'YYYY-WW') as week, COUNT(*) as count
      FROM "SearchLog"
      WHERE "createdAt" >= NOW() - INTERVAL '4 weeks'
      GROUP BY DATE_TRUNC('week', "createdAt")
      ORDER BY week ASC
    `,
    // Tráfico mensual (últimos 6 meses)
    prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
      SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month, COUNT(*) as count
      FROM "SearchLog"
      WHERE "createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `,
    // Búsquedas de hoy
    prisma.searchLog.count({
      where: { createdAt: { gte: today } },
    }),
    // Total búsquedas 30 días
    prisma.searchLog.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    }),
    // Total búsquedas período anterior
    prisma.searchLog.count({
      where: {
        createdAt: {
          gte: sixtyDaysAgo,
          lt: thirtyDaysAgo
        }
      },
    }),
    // Visitantes únicos (30 días)
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT "ip") as count
      FROM "SearchLog"
      WHERE "createdAt" >= ${thirtyDaysAgo} AND "ip" IS NOT NULL
    `,
    // Visitantes únicos período anterior
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT "ip") as count
      FROM "SearchLog"
      WHERE "createdAt" >= ${sixtyDaysAgo} AND "createdAt" < ${thirtyDaysAgo} AND "ip" IS NOT NULL
    `,
    // Visitantes de hoy
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT "ip") as count
      FROM "SearchLog"
      WHERE "createdAt" >= ${today} AND "ip" IS NOT NULL
    `,
  ]);

  const totalSearches = searchesCurrent;
  const uniqueVisitors = Number(uniqueVisitorsCurrent[0]?.count || 0);

  // Page views total
  const totalPageViews = topPages.reduce((s, r) => s + Number(r._count.path), 0);

  // Labels para page views
  const topPagesWithLabels = await prisma.pageView.findMany({
    where: {
      path: { in: topPages.map(p => p.path) },
      createdAt: { gte: thirtyDaysAgo }
    },
    select: { path: true, label: true }
  });

  const labelMap = new Map(topPagesWithLabels.map(p => [p.path, p.label]));
  const topPagesFormatted = topPages.map(p => ({
    path: p.path,
    label: labelMap.get(p.path) ?? null,
    count: Number(p._count.path)
  }));

  const searchesNoResults = recentSearches.filter((s) => s.results === 0).length;
  const topSearchTerm = topSearches[0]?.query || null;

  // Calcular tendencias
  const trendSearches = calculateTrend(totalSearches, searchesPrevious);
  const visitorsPrevious = Number(uniqueVisitorsPrevious[0]?.count || 0);
  const trendVisitors = calculateTrend(uniqueVisitors, visitorsPrevious);

  // Formatear datos de tráfico
  const traffic = {
    daily: trafficDaily.map(d => ({
      date: dayjs(d.date).format('DD/MM'),
      visitors: Number(d.count),
      searches: Number(d.count),
    })),
    weekly: trafficWeekly.map(d => ({
      date: d.week,
      visitors: Number(d.count),
      searches: Number(d.count),
    })),
    monthly: trafficMonthly.map(d => ({
      date: d.month,
      visitors: Number(d.count),
      searches: Number(d.count),
    })),
  };

  return NextResponse.json({
    topSearches: topSearches.map(r => ({ query: r.query, count: Number(r._count.query) })),
    topPages: topPagesFormatted,
    recentSearches,
    traffic,
    summary: {
      totalSearches,
      totalPageViews,
      uniqueVisitors,
      searchesNoResults,
      topSearchTerm,
      trendSearches,
      trendVisitors,
      todaySearches,
      todayVisitors: Number(todayVisitors[0]?.count || 0),
    },
  });
}