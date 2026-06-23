import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  exchangeForLongLivedToken,
  fetchPageTokens,
  fetchInstagramAccountId,
} from '@/lib/meta/graphApi';

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    const errorDesc = url.searchParams.get('error_description') || 'OAuth error';
    return NextResponse.redirect(
      `${APP_URL}/admin/settings?meta_error=${encodeURIComponent(errorDesc)}`
    );
  }

  if (!code) {
    return NextResponse.json({ error: 'Código de autorización faltante' }, { status: 400 });
  }

  const APP_ID = process.env.META_APP_ID;
  const APP_SECRET = process.env.META_APP_SECRET;

  if (!APP_ID || !APP_SECRET) {
    return NextResponse.json(
      { error: 'Credenciales META no configuradas' },
      { status: 500 }
    );
  }

  let state: { storeId?: string } = {};
  try {
    state = stateParam ? JSON.parse(stateParam) : {};
  } catch {
    // ignore parse errors
  }

  const storeId = state.storeId;
  if (!storeId) {
    return NextResponse.json({ error: 'storeId no proporcionado' }, { status: 400 });
  }

  const params = new URLSearchParams({
    client_id: APP_ID,
    client_secret: APP_SECRET,
    redirect_uri: `${APP_URL}/api/meta/oauth/callback`,
    code,
  });

  const tokenRes = await fetch(
    `https://graph.facebook.com/v22.0/oauth/access_token?${params}`
  );

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    console.error('OAuth token error:', errorText);
    return NextResponse.redirect(
      `${APP_URL}/admin/settings?meta_error=token_exchange_failed`
    );
  }

  const tokenData = await tokenRes.json();
  const shortLivedToken = tokenData.access_token;

  const longLived = await exchangeForLongLivedToken(shortLivedToken);
  if (!longLived) {
    return NextResponse.redirect(
      `${APP_URL}/admin/settings?meta_error=long_lived_exchange_failed`
    );
  }

  const pages = await fetchPageTokens(longLived.accessToken);
  if (!pages || pages.length === 0) {
    return NextResponse.redirect(
      `${APP_URL}/admin/settings?meta_error=no_pages_found`
    );
  }

  const page = pages[0];
  const instagramAccountId = await fetchInstagramAccountId(
    page.pageAccessToken,
    page.pageId
  );

  await prisma.metaToken.upsert({
    where: { storeId },
    create: {
      storeId,
      userAccessToken: longLived.accessToken,
      pageAccessToken: page.pageAccessToken,
      pageId: page.pageId,
      instagramAccountId: instagramAccountId ?? undefined,
      expiresAt: longLived.expiresAt,
    },
    update: {
      userAccessToken: longLived.accessToken,
      pageAccessToken: page.pageAccessToken,
      pageId: page.pageId,
      instagramAccountId: instagramAccountId ?? undefined,
      expiresAt: longLived.expiresAt,
      isValid: true,
    },
  });

  return NextResponse.redirect(
    `${APP_URL}/admin/meta?meta_success=connected`
  );
}