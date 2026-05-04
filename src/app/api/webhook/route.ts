import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET;

function isValidWhatsAppSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!WHATSAPP_APP_SECRET || !signatureHeader) return false;
  const [algo, signature] = signatureHeader.split('=');
  if (algo !== 'sha256' || !signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', WHATSAPP_APP_SECRET)
    .update(rawBody, 'utf8')
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const incomingBuffer = Buffer.from(signature, 'utf8');
  if (expectedBuffer.length !== incomingBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, incomingBuffer);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token && token === VERIFY_TOKEN) {
    return new NextResponse(challenge ?? 'OK', { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// sendWhatsAppText helper removed (unused) to silence ESLint warnings

export async function POST(request: Request) {
  // Always return 200 quickly to avoid repeated retries from Meta.
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get('x-hub-signature-256');

    if (!WHATSAPP_APP_SECRET || !isValidWhatsAppSignature(rawBody, signatureHeader)) {
      console.error('Invalid WhatsApp webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    // Minimal defensive parsing of WhatsApp Cloud webhook
    const change = body?.entry?.[0]?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];
    const contact = value?.contacts?.[0];

    if (!message) {
      // Non-message event (status, etc.) — ignore
      console.log('Webhook received non-message event');
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    const sender = message.from ?? contact?.wa_id;
    // Support text messages only in this simple example
    const userText = message?.text?.body ?? (message?.type === 'text' ? message?.text?.body : null);

    if (userText && sender) {
      console.log('Incoming WA message queued from', sender, userText.substring(0, 200));

      // Create a job in the DB for background processing (worker will pick it up)
      await prisma.job.create({
        data: {
          type: 'whatsapp_message',
          payload: {
            sender,
            userText,
            raw: message,
            contact,
          },
        },
      });
    }
  } catch (error) {
    console.error('Error handling webhook POST', error);
    // swallow — we still return 200 so Meta won't retry aggressively
  }

  return NextResponse.json({ status: 'received' }, { status: 200 });
}
