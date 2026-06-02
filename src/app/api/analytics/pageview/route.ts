import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { path, label } = await req.json() as { path?: string; label?: string };
    if (!path) return NextResponse.json({ ok: false }, { status: 400 });

    await prisma.pageView.create({
      data: { path, label: label ?? null },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
