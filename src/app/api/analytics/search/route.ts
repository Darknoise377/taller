import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { query, results } = await req.json() as { query?: string; results?: number };
    const q = (query ?? '').trim().toLowerCase();
    if (!q || q.length < 2) return NextResponse.json({ ok: false }, { status: 400 });

    await prisma.searchLog.create({
      data: { query: q, results: results ?? 0 },
    });

    return NextResponse.json({ ok: true });
  } catch {
    // No romper el flujo del cliente si analytics falla
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
