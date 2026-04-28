import { NextResponse } from 'next/server';
import sendToAI from '@/lib/ai';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_API_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_ID;
const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION ?? 'v17.0';

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

async function sendWhatsAppText(to: string, text: string) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.warn('WhatsApp token or phone id not configured');
    return;
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        text: { body: text },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('Failed sending WhatsApp message', res.status, txt);
    }
  } catch (error) {
    console.error('Error sending WhatsApp message', error);
  }
}

export async function POST(request: Request) {
  // Always return 200 quickly to avoid repeated retries from Meta.
  try {
    const body = await request.json();
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
      console.log('Incoming WA message from', sender, userText.substring(0, 200));

      const systemPrompt = process.env.WA_AI_SYSTEM_PROMPT ??
        'Eres un asistente de ventas para una tienda online. Responde en español, sé amable y conciso.';

      // Optionally load conversation history and pass to AI (not implemented here)
      const aiReply = await sendToAI({ userText, systemPrompt, history: [] });

      if (aiReply) {
        await sendWhatsAppText(sender, aiReply);
      }
    }
  } catch (error) {
    console.error('Error handling webhook POST', error);
    // swallow — we still return 200 so Meta won't retry aggressively
  }

  return NextResponse.json({ status: 'received' }, { status: 200 });
}
