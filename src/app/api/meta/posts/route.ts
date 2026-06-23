import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/config/admin';
import { prisma } from '@/lib/prisma';

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

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const storeId = req.nextUrl.searchParams.get('storeId') || 'default';

  try {
    const posts = await prisma.socialPost.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json({ posts });
  } catch (err) {
    console.error('[meta/posts]', err);
    return NextResponse.json({ error: 'Error al cargar publicaciones' }, { status: 500 });
  }
}