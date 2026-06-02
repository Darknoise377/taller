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
 * We return 200 immediately and process orders inline.
 */
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { processMeliOrder } from '@/lib/meli/sync';

const MELI_SECRET = process.env.MELI_SECRET_KEY ?? '';

/**
 * Validate MeLi HMAC-SHA256 signature.
 * Header format:  x-signature: ts=<timestamp>,v1=<hmac>
 * Signed content: ts + "." + userId + "." + dataId
 * Ref: https://developers.mercadolibre.com/es_ar/notificaciones-de-estados#Configurar-notificaciones
 */
function validateSignature(req: Request): boolean {
  // Skip validation in local dev when secret is not set
  if (!MELI_SECRET) {
    console.warn('[meli/webhook] MELI_SECRET_KEY not set — skipping signature check');
    return true;
  }

  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id');
  if (!xSignature) return false;

  const parts = Object.fromEntries(
    xSignature.split(',').map((p) => p.trim().split('=')),
  ) as Record<string, string>;
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  const url = new URL(req.url);
  const dataId = url.searchParams.get('id') ?? '';

  const manifest = `id:${dataId};request-id:${xRequestId ?? ''};ts:${ts};`;
  const expected = crypto.createHmac('sha256', MELI_SECRET).update(manifest).digest('hex');

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

  if (!validateSignature(req)) {
    // Log for debugging but always return 200 — MeLi will retry on non-2xx,
    // and bots scanning the endpoint shouldn't get a useful error response.
    console.warn('[meli/webhook] signature validation failed — ignored');
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  let body: { topic?: string; resource?: string; _id?: number; user_id?: number };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { topic, resource } = body;

  // ─── orders_v2: process synchronously (reduce stock, save record) ──────────
  if (topic === 'orders_v2' && resource) {
    // resource is like "/orders/2000003801"
    const orderId = resource.split('/').filter(Boolean).pop();
    if (orderId) {
      try {
        await processMeliOrder(orderId);
      } catch (err) {
        console.error('[meli/webhook] Failed to process order', orderId, err);
        // Still return 200 — MeLi will retry if we return non-2xx
      }
    }
    return NextResponse.json({ ok: true });
  }

  // ─── Other topics: enqueue for async processing ─────────────────────────────
  try {
    await prisma.job.create({
      data: {
        type: `MELI_${(topic ?? 'unknown').toUpperCase()}`,
        payload: { topic, resource, receivedAt: new Date().toISOString() },
      },
    });
  } catch (err) {
    console.error('[meli/webhook] Failed to enqueue job:', err);
  }

  return NextResponse.json({ ok: true });
}
