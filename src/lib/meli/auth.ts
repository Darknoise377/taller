/**
 * Mercado Libre OAuth 2.0 helpers.
 * Handles token exchange, refresh (access_token expires every 6h),
 * and secure persistence in the MeliToken singleton row.
 */
import { prisma } from '@/lib/prisma';

const MELI_AUTH_URL = 'https://auth.mercadolibre.com.co/authorization';
const MELI_TOKEN_URL = 'https://api.mercadolibre.com/oauth/token';
const MELI_API_BASE = 'https://api.mercadolibre.com';

// Refresh 5 minutes before real expiry to avoid race conditions.
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export interface MeliTokenRow {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  meliUserId: string;
  nickname?: string | null;
}

// ─── Build the OAuth redirect URL ────────────────────────────────────────────
export function buildAuthUrl(): string {
  const appId = process.env.MELI_APP_ID;
  const redirectUri = process.env.MELI_REDIRECT_URI;
  if (!appId || !redirectUri) throw new Error('MELI_APP_ID / MELI_REDIRECT_URI not set');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: appId,
    redirect_uri: redirectUri,
  });
  return `${MELI_AUTH_URL}?${params.toString()}`;
}

// ─── Exchange authorization code for tokens ───────────────────────────────────
export async function exchangeCode(code: string): Promise<void> {
  const appId = process.env.MELI_APP_ID;
  const secret = process.env.MELI_SECRET_KEY;
  const redirectUri = process.env.MELI_REDIRECT_URI;
  if (!appId || !secret || !redirectUri) {
    throw new Error('MELI_APP_ID / MELI_SECRET_KEY / MELI_REDIRECT_URI not set');
  }

  const res = await fetch(MELI_TOKEN_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: appId,
      client_secret: secret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MeLi token exchange failed: ${err}`);
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user_id: number;
  };

  // Fetch seller nickname
  const userRes = await fetch(`${MELI_API_BASE}/users/${data.user_id}`, {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const userData = userRes.ok ? (await userRes.json() as { nickname?: string }) : {};

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  await prisma.meliToken.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      meliUserId: String(data.user_id),
      nickname: userData.nickname ?? null,
    },
    update: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      meliUserId: String(data.user_id),
      nickname: userData.nickname ?? null,
    },
  });
}

// ─── Silently refresh if the token is near expiry ────────────────────────────
async function refreshAccessToken(token: MeliTokenRow): Promise<MeliTokenRow> {
  const appId = process.env.MELI_APP_ID;
  const secret = process.env.MELI_SECRET_KEY;
  if (!appId || !secret) throw new Error('MELI_APP_ID / MELI_SECRET_KEY not set');

  const res = await fetch(MELI_TOKEN_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: appId,
      client_secret: secret,
      refresh_token: token.refreshToken,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MeLi token refresh failed: ${err}`);
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  const updated = await prisma.meliToken.update({
    where: { id: 1 },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
    },
  });

  return updated;
}

// ─── Get a valid access token (refreshes automatically if needed) ─────────────
export async function getValidToken(): Promise<string> {
  const token = await prisma.meliToken.findUnique({ where: { id: 1 } });
  if (!token) throw new Error('MeLi account not connected');

  const needsRefresh = token.expiresAt.getTime() - Date.now() < REFRESH_BUFFER_MS;
  if (needsRefresh) {
    const refreshed = await refreshAccessToken(token);
    return refreshed.accessToken;
  }

  return token.accessToken;
}

// ─── Disconnect (delete token from DB) ───────────────────────────────────────
export async function disconnectMeli(): Promise<void> {
  await prisma.meliToken.deleteMany({ where: { id: 1 } });
}

// ─── Check if MeLi is connected ──────────────────────────────────────────────
export async function getMeliConnectionStatus(): Promise<{
  connected: boolean;
  nickname?: string;
  expiresAt?: Date;
}> {
  const token = await prisma.meliToken.findUnique({ where: { id: 1 } });
  if (!token) return { connected: false };
  return { connected: true, nickname: token.nickname ?? undefined, expiresAt: token.expiresAt };
}
