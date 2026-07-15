import { NextResponse } from 'next/server';
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

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    // Obtenemos las últimas 50 órdenes de MeLi ordenadas por creación
    const orders = await prisma.meliOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        meliOrderId: true,
        status: true,
        rawPayload: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ orders });
  } catch (err) {
    console.error('[meli/orders]', err);
    return NextResponse.json({ error: 'Error al cargar órdenes' }, { status: 500 });
  }
}