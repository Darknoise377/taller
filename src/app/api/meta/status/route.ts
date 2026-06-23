import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId es requerido' },
        { status: 400 }
      );
    }

    const token = await prisma.metaToken.findUnique({
      where: { storeId },
      select: {
        isValid: true,
        expiresAt: true,
        pageId: true,
        instagramAccountId: true,
      },
    });

    if (!token) {
      return NextResponse.json(
        { connected: false, message: 'No hay conexión Meta configurada' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        connected: token.isValid,
        pageId: token.pageId,
        hasInstagram: !!token.instagramAccountId,
        expiresAt: token.expiresAt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}