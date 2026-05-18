/**
 * GET /api/meli/callback
 * MeLi redirects here with ?code=... after the user authorizes the app.
 * Exchanges the code for tokens and saves them, then redirects to the admin panel.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCode } from '@/lib/meli/auth';

const ADMIN_MELI_PAGE = '/admin/meli';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) {
    const reason = error ?? 'missing_code';
    return NextResponse.redirect(
      new URL(`${ADMIN_MELI_PAGE}?error=${reason}`, url.origin),
    );
  }

  const cookieStore = await cookies();
  const codeVerifier = cookieStore.get('meli_pkce_verifier')?.value;

  if (!codeVerifier) {
    return NextResponse.redirect(
      new URL(`${ADMIN_MELI_PAGE}?error=missing_code_verifier`, url.origin),
    );
  }

  try {
    await exchangeCode(code, codeVerifier);
    const res = NextResponse.redirect(new URL(`${ADMIN_MELI_PAGE}?connected=1`, url.origin));
    res.cookies.delete('meli_pkce_verifier');
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[meli/callback] token_exchange_failed:', msg);
    const res = NextResponse.redirect(
      new URL(`${ADMIN_MELI_PAGE}?error=token_exchange_failed&detail=${encodeURIComponent(msg)}`, url.origin),
    );
    res.cookies.delete('meli_pkce_verifier');
    return res;
  }
}
