import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function validateCdnUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok && res.headers.get('content-type')?.startsWith('image/') === true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const { storeId, mediaUrl, caption, platform = 'BOTH' } = await req.json();

    if (!storeId || !mediaUrl || !caption) {
      return NextResponse.json(
        { error: 'storeId, mediaUrl y caption son requeridos' },
        { status: 400 }
      );
    }

    if (!await validateCdnUrl(mediaUrl)) {
      return NextResponse.json(
        { error: 'La URL de imagen no es accesible o no es una imagen válida' },
        { status: 400 }
      );
    }

    const validPlatforms = ['FACEBOOK', 'INSTAGRAM', 'BOTH'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: 'platform debe ser FACEBOOK, INSTAGRAM o BOTH' },
        { status: 400 }
      );
    }

    const token = await prisma.metaToken.findUnique({
      where: { storeId },
    });

    if (!token || !token.isValid) {
      return NextResponse.json(
        { error: 'Token de Meta no configurado o inválido para esta tienda' },
        { status: 401 }
      );
    }

    const socialPost = await prisma.socialPost.create({
      data: {
        storeId,
        platform,
        status: 'PROCESSING',
        mediaUrl,
        caption,
      },
    });

    await prisma.job.create({
      data: {
        type: 'social_publish',
        payload: {
          socialPostId: socialPost.id,
          storeId,
          pageAccessToken: token.pageAccessToken,
          pageId: token.pageId,
          instagramAccountId: token.instagramAccountId,
          mediaUrl,
          caption,
          platform,
        },
      },
    });

    return NextResponse.json(
      { message: 'Publicación en cola', postId: socialPost.id },
      { status: 202 }
    );
  } catch (error) {
    console.error('Publish endpoint error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}