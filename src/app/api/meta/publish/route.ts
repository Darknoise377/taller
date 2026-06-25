import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  publishToFacebook,
  createInstagramMediaContainer,
  publishInstagramContainer,
} from '@/lib/meta/graphApi';

async function validateCdnUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok && res.headers.get('content-type')?.startsWith('image/') === true;
  } catch {
    return false;
  }
}

async function processPublish(payload: {
  socialPostId: string;
  pageAccessToken: string;
  pageId: string;
  instagramAccountId?: string;
  mediaUrl: string;
  caption: string;
  platform: string;
}) {
  const { socialPostId, pageAccessToken, pageId, instagramAccountId, mediaUrl, caption, platform } = payload;

  const results: { facebookId?: string; instagramId?: string } = {};

  if (platform === 'FACEBOOK' || platform === 'BOTH') {
    const fbPostId = await publishToFacebook(pageAccessToken, pageId, mediaUrl, caption);
    if (fbPostId) {
      results.facebookId = fbPostId;
    } else {
      throw new Error('Error publicando en Facebook');
    }
  }

  if ((platform === 'INSTAGRAM' || platform === 'BOTH') && instagramAccountId) {
    const containerId = await createInstagramMediaContainer(pageAccessToken, instagramAccountId, mediaUrl, caption);
    if (!containerId) {
      throw new Error('Error creando contenedor de Instagram');
    }
    const igPostId = await publishInstagramContainer(pageAccessToken, instagramAccountId, containerId);
    if (igPostId) {
      results.instagramId = igPostId;
    } else {
      throw new Error('Error publicando en Instagram');
    }
  }

  const metaPostId = results.facebookId || results.instagramId || undefined;
  await prisma.socialPost.update({
    where: { id: socialPostId },
    data: {
      status: 'PUBLISHED',
      metaPostId,
    },
  });
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

    try {
      await processPublish({
        socialPostId: socialPost.id,
        pageAccessToken: token.pageAccessToken,
        pageId: token.pageId,
        instagramAccountId: token.instagramAccountId,
        mediaUrl,
        caption,
        platform,
      });
      
      return NextResponse.json(
        { message: 'Publicado exitosamente', postId: socialPost.id },
        { status: 200 }
      );
    } catch (err) {
      await prisma.socialPost.update({
        where: { id: socialPost.id },
        data: {
          status: 'FAILED',
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      });
      
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Error al publicar' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Publish endpoint error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}