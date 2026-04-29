import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

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
