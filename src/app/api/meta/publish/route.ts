import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  publishToFacebook,
  createInstagramMediaContainer,
  publishInstagramContainer,
  fetchPostInsights,
  editFacebookPost,
} from '@/lib/meta/graphApi';
import cloudinary from '@/lib/cloudinary';

async function validateToken(pageAccessToken: string, pageId: string): Promise<boolean> {
  try {
    const res = await fetch(`https://graph.facebook.com/v25.0/${pageId}?fields=id&access_token=${pageAccessToken}`);
    const data = await res.json();
    return res.ok && !!data.id;
  } catch {
    return false;
  }
}

async function validateMediaUrl(url: string): Promise<{ valid: boolean; isVideo: boolean }> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const contentType = res.headers.get('content-type') || '';
    const isVideo = contentType.startsWith('video/');
    const isImage = contentType.startsWith('image/');
    return { valid: res.ok && (isVideo || isImage), isVideo };
  } catch {
    return { valid: false, isVideo: false };
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
  isVideo?: boolean;
}) {
  const { socialPostId, pageAccessToken, pageId, instagramAccountId, mediaUrl, caption, platform, isVideo } = payload;

  const results: { facebookId?: string; instagramId?: string } = {};

  if (platform === 'FACEBOOK' || platform === 'BOTH') {
    const fbPostId = await publishToFacebook(pageAccessToken, pageId, mediaUrl, caption, isVideo);
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
    const contentType = req.headers.get('content-type') || '';
    
    let storeId: string, mediaUrl: string, caption: string, platform = 'BOTH', isVideo = false;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      storeId = form.get('storeId') as string;
      caption = form.get('caption') as string;
      platform = (form.get('platform') as string) || 'BOTH';
      isVideo = form.get('isVideo') === 'true';
      
      const file = form.get('file') as File | null;
      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        const uploaded = await new Promise<{ secure_url: string }>((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { resource_type: isVideo ? 'video' : 'image', folder: 'meta-publish' },
            (err, result) => {
              if (err || !result?.secure_url) reject(err || new Error('Upload failed'));
              else resolve(result);
            }
          ).end(Buffer.from(arrayBuffer));
        });
        mediaUrl = uploaded.secure_url;
      }
    } else {
      ({ storeId, mediaUrl, caption, platform, isVideo } = await req.json());
    }

    if (!storeId || !mediaUrl && !isVideo && !caption) {
      return NextResponse.json({ error: 'storeId y caption son requeridos' }, { status: 400 });
    }

    const validPlatforms = ['FACEBOOK', 'INSTAGRAM', 'BOTH'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json({ error: 'platform debe ser FACEBOOK, INSTAGRAM o BOTH' }, { status: 400 });
    }

    const token = await prisma.metaToken.findUnique({ where: { storeId } });

    if (!token || !token.isValid) {
      return NextResponse.json({ error: 'Token de Meta no configurado o inválido' }, { status: 401 });
    }

    if (!await validateToken(token.pageAccessToken, token.pageId)) {
      return NextResponse.json({ error: 'Page Access Token inválido. Reconecta.' }, { status: 401 });
    }

    const socialPost = await prisma.socialPost.create({
      data: { storeId, platform, status: 'PROCESSING', mediaUrl: mediaUrl || '', caption },
    });

    try {
      await processPublish({
        socialPostId: socialPost.id,
        pageAccessToken: token.pageAccessToken,
        pageId: token.pageId,
        instagramAccountId: token.instagramAccountId ?? undefined,
        mediaUrl: mediaUrl || '',
        caption,
        platform,
        isVideo,
      });
      return NextResponse.json({ message: 'Publicado exitosamente', postId: socialPost.id });
    } catch (err) {
      await prisma.socialPost.update({
        where: { id: socialPost.id },
        data: { status: 'FAILED', errorMessage: err instanceof Error ? err.message : String(err) },
      });
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Error al publicar' }, { status: 500 });
    }
  } catch (error) {
    console.error('Publish endpoint error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { postId, caption } = await req.json();
    
    if (!postId || !caption) {
      return NextResponse.json({ error: 'postId y caption son requeridos' }, { status: 400 });
    }

    const post = await prisma.socialPost.findUnique({ where: { id: postId } });
    if (!post || !post.metaPostId) {
      return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
    }

    const token = await prisma.metaToken.findFirst({ where: { isValid: true } });
    if (!token) {
      return NextResponse.json({ error: 'Token no configurado' }, { status: 401 });
    }

    const success = await editFacebookPost(token.pageAccessToken, post.metaPostId, caption);
    if (!success) {
      return NextResponse.json({ error: 'Error editando en Meta' }, { status: 500 });
    }

    await prisma.socialPost.update({
      where: { id: postId },
      data: { caption, updatedAt: new Date() },
    });

    return NextResponse.json({ message: 'Actualizado exitosamente' });
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');

    const token = await prisma.metaToken.findFirst({ where: { isValid: true } });
    if (!token?.pageAccessToken) {
      return NextResponse.json({ error: 'Token no configurado' }, { status: 401 });
    }

    if (postId) {
      const post = await prisma.socialPost.findUnique({ where: { id: postId } });
      if (!post?.metaPostId) {
        return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 });
      }

      const insights = await fetchPostInsights(token.pageAccessToken, post.metaPostId);
      return NextResponse.json({ insights });
    }

    const posts = await prisma.socialPost.findMany({
      where: { storeId: 'default' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const postsWithInsights = await Promise.all(
      posts.map(async (p) => {
        let insights = null;
        if (p.metaPostId) {
          insights = await fetchPostInsights(token.pageAccessToken, p.metaPostId);
        }
        return { ...p, insights };
      })
    );

    return NextResponse.json({ posts: postsWithInsights });
  } catch (error) {
    return NextResponse.json({ error: 'Error obteniendo datos' }, { status: 500 });
  }
}