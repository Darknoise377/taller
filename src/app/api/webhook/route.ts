import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { processWhatsAppMessage } from '@/lib/whatsapp/processMessage';
import { processMessengerMessage } from '@/lib/messenger/processMessage';
import { processFbComment } from '@/lib/messenger/processComment';

export const maxDuration = 60; // allow up to 60s for AI processing (Vercel Pro)

const VERIFY_TOKENS = [
  process.env.WHATSAPP_VERIFY_TOKEN,
  process.env.META_VERIFY_TOKEN,
].filter((token): token is string => Boolean(token));

const APP_SECRETS = [
  process.env.WHATSAPP_APP_SECRET,
  process.env.META_APP_SECRET,
  process.env.MESSENGER_APP_SECRET,
].filter((secret): secret is string => Boolean(secret));

function isValidSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (APP_SECRETS.length === 0 || !signatureHeader) return false;
  const [algo, signature] = signatureHeader.split('=');
  if (algo !== 'sha256' || !signature) return false;

  const incomingBuffer = Buffer.from(signature, 'utf8');

  return APP_SECRETS.some((secret) => {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    if (expectedBuffer.length !== incomingBuffer.length) return false;
    return crypto.timingSafeEqual(expectedBuffer, incomingBuffer);
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token && VERIFY_TOKENS.includes(token)) {
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

    if (APP_SECRETS.length === 0 || !isValidSignature(rawBody, signatureHeader)) {
      console.error('Invalid Meta webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const entry = body?.entry?.[0];

    // ── Messenger DM ───────────────────────────────────────────────────────
    // Payload: entry.messaging[].{sender.id, message.text}
    const messengerEvent = entry?.messaging?.[0];
    if (messengerEvent) {
      const psid: string | undefined = messengerEvent?.sender?.id;
      const text: string | undefined = messengerEvent?.message?.text;

      // Ignore echo events (messages sent by the page itself)
      const isEcho = messengerEvent?.message?.is_echo === true;

      if (psid && text && !isEcho) {
        console.log('[Messenger] DM from', psid, text.substring(0, 200));
        await processMessengerMessage(psid, text, messengerEvent);
      } else {
        console.log('[Messenger] Non-text or echo event — ignored');
      }

      return NextResponse.json({ status: 'received' }, { status: 200 });
    }

    // ── WhatsApp & Facebook feed events (via changes[]) ────────────────────
    const change = entry?.changes?.[0];

    // ── Facebook post comment ──────────────────────────────────────────────
    // Payload: change.field === 'feed', change.value.item === 'comment'
    if (change?.field === 'feed') {
      const feedValue = change?.value;
      const isNewComment =
        feedValue?.item === 'comment' && feedValue?.verb === 'add' && feedValue?.message;

      if (isNewComment) {
        const commentId: string | undefined = feedValue?.comment_id;
        const commentText: string | undefined = feedValue?.message;
        const authorName: string | undefined = feedValue?.from?.name;

        if (commentId && commentText) {
          console.log('[FB Comment] from', authorName, '—', commentText.substring(0, 200));
          await processFbComment(commentId, commentText, authorName);
        }
      } else {
        console.log('[FB Feed] Non-comment feed event — ignored');
      }

      return NextResponse.json({ status: 'received' }, { status: 200 });
    }

    // ── WhatsApp Business message ─────────────────────────────────────────
    // Payload: change.field === 'messages', change.value.messages[]
    const value = change?.value;
    const message = value?.messages?.[0];
    const contact = value?.contacts?.[0];

    if (!message) {
      // Status update, delivery receipt, read receipt — ignore
      console.log('[Webhook] Non-message event received — ignored');
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    const sender: string | undefined = message.from ?? contact?.wa_id;
    const userText: string | undefined =
      message?.type === 'text' ? (message?.text?.body as string | undefined) : undefined;

    if (userText && sender) {
      console.log('[WhatsApp] Message from', sender, userText.substring(0, 200));
      await processWhatsAppMessage(sender, userText, message);
    }
  } catch (error) {
    console.error('[Webhook] Error handling POST:', error);
    // swallow — return 200 so Meta won't retry aggressively
  }

  return NextResponse.json({ status: 'received' }, { status: 200 });
}
