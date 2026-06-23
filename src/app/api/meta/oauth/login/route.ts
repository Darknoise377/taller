import { NextResponse } from 'next/server';

const APP_ID = process.env.META_APP_ID;
const REDIRECT_URI = `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL}/api/meta/oauth/callback`;
const SCOPES = [
  'pages_manage_posts',
  'pages_read_engagement',
  'pages_show_list',
  'instagram_basic',
  'instagram_content_publish',
  'pages_manage_engagement',
].join(',');

export function GET(req: Request) {
  const url = new URL(req.url);
  const storeId = url.searchParams.get('storeId') || '';

  if (!APP_ID) {
    return NextResponse.json(
      { error: 'META_APP_ID no configurado' },
      { status: 500 }
    );
  }

  const authUrl = new URL('https://www.facebook.com/v22.0/dialog/oauth');
  authUrl.searchParams.set('client_id', APP_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('state', JSON.stringify({ storeId }));

  return NextResponse.redirect(authUrl.toString());
}