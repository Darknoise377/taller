import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const postId = url.searchParams.get('postId');

  if (!postId) {
    return NextResponse.json({ error: 'postId requerido' }, { status: 400 });
  }

  try {
    const socialPost = await prisma.socialPost.findUnique({
      where: { id: postId },
    });

    if (!socialPost?.metaPostId) {
      return NextResponse.json({ error: 'Publicación no encontrada o sin ID de Meta' }, { status: 404 });
    }

    // Obtener insights de Facebook
    const pageToken = process.env.META_PAGE_TOKEN; // Token de página para leer insights
    if (!pageToken) {
      return NextResponse.json({ error: 'META_PAGE_TOKEN no configurado' }, { status: 500 });
    }

    const insightsRes = await fetch(
      `https://graph.facebook.com/v25.0/${socialPost.metaPostId}?fields=likes.summary(true),comments.summary(true),shares&access_token=${pageToken}`
    );

    if (!insightsRes.ok) {
      return NextResponse.json({ error: 'No se pudieron obtener insights' }, { status: 500 });
    }

    const insights = await insightsRes.json();
    
    return NextResponse.json({
      postId: socialPost.metaPostId,
      likes: insights.likes?.summary?.total_count || 0,
      comments: insights.comments?.summary?.total_count || 0,
      shares: insights.shares?.count || 0,
    });
  } catch (error) {
    console.error('Insights error:', error);
    return NextResponse.json({ error: 'Error al obtener insights' }, { status: 500 });
  }
}