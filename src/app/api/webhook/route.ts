import { after, NextResponse } from 'next/server';
import crypto from 'crypto';
import { processWhatsAppMessage } from '@/lib/whatsapp/processMessage';
import { processMessengerMessage } from '@/lib/messenger/processMessage';
import { processFbComment } from '@/lib/messenger/processComment';

export const maxDuration = 30; // Max duration for serverless processing

const VERIFY_TOKENS = [
  process.env.WHATSAPP_VERIFY_TOKEN,
  process.env.META_VERIFY_TOKEN,
].filter((token): token is string => Boolean(token && !token.startsWith('replace_')));

const APP_SECRETS = [
  process.env.WHATSAPP_APP_SECRET,
  process.env.META_APP_SECRET,
  process.env.MESSENGER_APP_SECRET,
].filter((secret): secret is string => Boolean(secret && !secret.startsWith('replace_') && secret.length >= 8));

function isValidSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (APP_SECRETS.length === 0) return true; // If no secret is configured, allow for setup/fallback
  if (!signatureHeader) return false;

  const parts = signatureHeader.trim().split('=');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'sha256') return false;
  const signature = parts[1];

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
    console.log('[Webhook GET] Verified subscription successfully');
    return new NextResponse(challenge ?? 'OK', { status: 200 });
  }

  console.warn('[Webhook GET] Subscription verification failed. Received token:', token ? `${token.slice(0, 4)}...` : 'none');
  return new NextResponse('Forbidden', { status: 403 });
}

async function processMetaEntry(entry: {
  messaging?: Array<{
    sender?: { id?: string };
    message?: { text?: string; is_echo?: boolean };
  }>;
  changes?: Array<{
    field?: string;
    value?: {
      item?: string;
      verb?: string;
      message?: string;
      comment_id?: string;
      from?: { name?: string };
      messages?: Array<{
        from?: string;
        type?: string;
        text?: { body?: string };
        button?: { text?: string };
        interactive?: {
          button_reply?: { title?: string; id?: string };
          list_reply?: { title?: string; id?: string };
        };
      }>;
      contacts?: Array<{ wa_id?: string }>;
    };
  }>;
}) {
  for (const messengerEvent of entry.messaging ?? []) {
    const psid = messengerEvent.sender?.id;
    const text = messengerEvent.message?.text;
    const isEcho = messengerEvent.message?.is_echo === true;

    if (psid && text && !isEcho) {
      console.log('[Messenger] DM from', psid, text.substring(0, 200));
      await processMessengerMessage(psid, text, messengerEvent);
    }
  }

  for (const change of entry.changes ?? []) {
    if (change.field === 'feed') {
      const feedValue = change.value;
      const isNewComment =
        feedValue?.item === 'comment' && feedValue.verb === 'add' && feedValue.message;

      if (isNewComment && feedValue.comment_id && feedValue.message) {
        console.log('[FB Comment] from', feedValue.from?.name, '-', feedValue.message.substring(0, 200));
        await processFbComment(feedValue.comment_id, feedValue.message, feedValue.from?.name);
      }
      continue;
    }

    if (change.field !== 'messages') continue;

    const contact = change.value?.contacts?.[0];
    for (const message of change.value?.messages ?? []) {
      const sender = message.from ?? contact?.wa_id;
      let userText: string | undefined;

      if (message.type === 'text') {
        userText = message.text?.body;
      } else if (message.type === 'button') {
        userText = message.button?.text;
      } else if (message.type === 'interactive') {
        userText =
          message.interactive?.button_reply?.title ||
          message.interactive?.list_reply?.title;
      }

      if (userText && sender) {
        console.log('[WhatsApp] Message from', sender, userText.substring(0, 200));
        await processWhatsAppMessage(sender, userText, message);
      }
    }
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get('x-hub-signature-256');

    if (APP_SECRETS.length > 0) {
      if (!isValidSignature(rawBody, signatureHeader)) {
        console.error('[Webhook] Invalid Meta webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      console.warn(
        '[Webhook] No WHATSAPP_APP_SECRET or META_APP_SECRET configured in env vars. Proceeding without signature check.'
      );
    }

    const body = JSON.parse(rawBody) as { entry?: Parameters<typeof processMetaEntry>[0][] };
    after(async () => {
      for (const entry of body.entry ?? []) {
        try {
          await processMetaEntry(entry);
        } catch (error) {
          console.error('[Webhook] Error processing entry:', error);
        }
      }
    });
  } catch (error) {
    console.error('[Webhook] Error accepting POST:', error);
  }

  return NextResponse.json({ status: 'received' }, { status: 200 });
}
