/**
 * POST /api/webhooks/meli
 *
 * MeLi sends notifications here for:
 *   - orders_v2  (new / updated orders)
 *   - items      (listing status changes)
 *   - shipments  (shipping updates)
 *
 * Security: we validate the X-Signature header using HMAC-SHA256.
 * Docs: https://developers.mercadolibre.com.ar/es_ar/notificaciones-de-estados
 *
 * We return 200 immediately and process via a Job row.
 */
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

const MELI_SECRET = process.env.MELI_SECRET_KEY ?? '';

/**
 * Validate MeLi HMAC-SHA256 signature.
 * Header format:  x-signature: ts=<timestamp>,v1=<hmac>
 * Signed content: ts + "." + userId + "." + dataId
 * Ref: https://developers.mercadolibre.com/es_ar/notificaciones-de-estados#Configurar-notificaciones
 */
function validateSignature(req: Request): boolean {
  // Skip validation in local dev when secret is not set
  if (!MELI_SECRET) return true;

  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id');
  if (!xSignature) return false;

  const parts = Object.fromEntries(
    xSignature.split(',').map((p) => p.trim().split('=')),
  ) as Record<string, string>;
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  // MeLi signs: "ts" + dataId (from query string)
  // dataId comes from the `data.id` in the body or the `id` query param
  const url = new URL(req.url);
  const dataId = url.searchParams.get('id') ?? '';
  url.searchParams.get('user_id');

  const manifest = `id:${dataId};request-id:${xRequestId ?? ''};ts:${ts};`;
  const expected = crypto.createHmac('sha256', MELI_SECRET).update(manifest).digest('hex');

  // timingSafeEqual throws if buffer lengths differ — guard explicitly
  const v1Buf = Buffer.from(v1, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  if (v1Buf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(v1Buf, expectedBuf);
}

export async function POST(req: Request) {
  let rawBody = '';
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  // Validate signature
  if (!validateSignature(req)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: { topic?: string; resource?: string; _id?: number; user_id?: number };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { topic, resource } = body;

  // Enqueue for async processing
  try {
    await prisma.job.create({
      data: {
        type: `MELI_${(topic ?? 'unknown').toUpperCase()}`,
        payload: { topic, resource, receivedAt: new Date().toISOString() },
      },
    });
  } catch (err) {
    console.error('[meli/webhook] Failed to enqueue job:', err);
    // Still return 200 to prevent MeLi from retrying immediately
  }

  return NextResponse.json({ ok: true });
}
