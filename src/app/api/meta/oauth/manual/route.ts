import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { storeId, pageAccessToken, pageId, instagramAccountId, expiresAt } = await req.json();

    if (!storeId || !pageAccessToken || !pageId) {
      return NextResponse.json(
        { error: 'storeId, pageAccessToken y pageId son requeridos' },
        { status: 400 }
      );
    }

    await prisma.metaToken.upsert({
      where: { storeId },
      create: {
        storeId,
        userAccessToken: pageAccessToken,
        pageAccessToken,
        pageId,
        instagramAccountId: instagramAccountId ?? undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      },
      update: {
        userAccessToken: pageAccessToken,
        pageAccessToken,
        pageId,
        instagramAccountId: instagramAccountId ?? undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        isValid: true,
      },
    });

    return NextResponse.json({ message: 'Conexión guardada' });
  } catch (error) {
    console.error('Manual connect error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}