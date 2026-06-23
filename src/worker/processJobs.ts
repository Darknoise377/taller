/* Worker: poll jobs from DB and process them.
    Run locally with: `npm run ai:worker`
*/
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import sendToAI from '@/lib/ai';
import {
  publishToFacebook,
  createInstagramMediaContainer,
  publishInstagramContainer,
} from '@/lib/meta/graphApi';

const WHATSAPP_TOKEN = process.env.WHATSAPP_API_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_ID;
const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION ?? 'v17.0';

async function sendWhatsAppText(to: string, text: string) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.warn('WhatsApp token or phone id not configured');
    return;
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`;
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
    throw new Error(`WhatsApp send failed: ${res.status} ${txt}`);
  }
}

async function processOne() {
  const job = await prisma.job.findFirst({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' } });
  if (!job) return false;

  await prisma.job.update({ where: { id: job.id }, data: { status: 'PROCESSING', attempts: job.attempts + 1 } });

  try {
    const payload = job.payload as unknown;
    if (job.type === 'whatsapp_message') {
      const p = (payload && typeof payload === 'object') ? payload as Record<string, unknown> : {};
      const sender = typeof p.sender === 'string' ? p.sender : '';
      const userText = typeof p.userText === 'string' ? p.userText : '';

      // find or create session
      let session = await prisma.chatSession.findFirst({ where: { phone: sender } });
      if (!session) {
        session = await prisma.chatSession.create({ data: { phone: sender } });
      }

      // save user message
      await prisma.chatMessage.create({ data: { sessionId: session.id, role: 'user', content: userText, metadata: (p.raw ?? null) as Prisma.InputJsonValue } });

      // fetch history (last 20 messages)
      const messages = await prisma.chatMessage.findMany({ where: { sessionId: session.id }, orderBy: { createdAt: 'asc' }, take: 50 });
      type ChatHistoryItem = { role: 'user' | 'assistant' | 'system'; content: string };
      const history: ChatHistoryItem[] = messages.map((m) => ({ role: (m.role === 'user' || m.role === 'assistant' || m.role === 'system') ? m.role : 'user', content: m.content }));

      const systemPrompt = process.env.WA_AI_SYSTEM_PROMPT ?? 'Eres un asistente de ventas para una tienda online. Responde en español, sé amable y conciso.';

      const aiReply = await sendToAI({ userText, systemPrompt, history });

      // save assistant reply
      await prisma.chatMessage.create({ data: { sessionId: session.id, role: 'assistant', content: aiReply } });

      // send via WhatsApp
      await sendWhatsAppText(sender, aiReply);
    }

    if (job.type === 'social_publish') {
      const p = (payload && typeof payload === 'object') ? payload as Record<string, unknown> : {};
      const socialPostId = typeof p.socialPostId === 'string' ? p.socialPostId : '';
      const pageAccessToken = typeof p.pageAccessToken === 'string' ? p.pageAccessToken : '';
      const pageId = typeof p.pageId === 'string' ? p.pageId : '';
      const instagramAccountId = p.instagramAccountId ? String(p.instagramAccountId) : undefined;
      const mediaUrl = typeof p.mediaUrl === 'string' ? p.mediaUrl : '';
      const caption = typeof p.caption === 'string' ? p.caption : '';
      const platform = typeof p.platform === 'string' ? p.platform : 'BOTH';

      if (!socialPostId || !pageAccessToken || !pageId || !mediaUrl) {
        throw new Error('Payload incompleto para publicación social');
      }

      const results: { facebookId?: string; instagramId?: string } = {};

      if (platform === 'FACEBOOK' || platform === 'BOTH') {
        const fbPostId = await publishToFacebook(pageAccessToken, pageId, mediaUrl, caption);
        if (fbPostId) {
          results.facebookId = fbPostId;
        } else {
          throw new Error('Error publicando en Facebook');
        }
      }

      if ((platform === 'INSTAGRAM' || platform === 'BOTH') && instagramAccountId) {
        const containerId = await createInstagramMediaContainer(pageAccessToken, instagramAccountId, mediaUrl, caption);
        if (!containerId) {
          throw new Error('Error creando contenedor de Instagram');
        }
        const igPostId = await publishInstagramContainer(pageAccessToken, instagramAccountId, containerId);
        if (igPostId) {
          results.instagramId = igPostId;
        } else {
          throw new Error('Error publicando en Instagram');
        }
      }

      const metaPostId = results.facebookId || results.instagramId || undefined;
      await prisma.socialPost.update({
        where: { id: socialPostId },
        data: {
          status: 'PUBLISHED',
          metaPostId,
        },
      });
    }

    await prisma.job.update({ where: { id: job.id }, data: { status: 'COMPLETED', processedAt: new Date() } });
    return true;
  } catch (err) {
    console.error('Job processing failed:', err);
    const errStr = err instanceof Error ? err.message : String(err);

    const payload = job.payload as unknown;
    const socialPostId = typeof (payload as Record<string, unknown>)?.socialPostId === 'string'
      ? ((payload as Record<string, unknown>).socialPostId as string)
      : undefined;

    if (socialPostId) {
      await prisma.socialPost.update({
        where: { id: socialPostId },
        data: {
          status: 'FAILED',
          errorMessage: errStr,
        },
      });
    }

    if (errStr.includes('OAuthException') || errStr.includes('(#190)')) {
      const storeId = typeof (payload as Record<string, unknown>)?.storeId === 'string'
        ? ((payload as Record<string, unknown>).storeId as string)
        : undefined;
      if (storeId) {
        await prisma.metaToken.updateMany({
          where: { storeId },
          data: { isValid: false },
        });
      }
    }

    await prisma.job.update({ where: { id: job.id }, data: { status: 'FAILED' } });
    return true;
  }
}

async function loop() {
  console.log('Worker started, polling jobs...');
  while (true) {
    try {
      const didWork = await processOne();
      if (!didWork) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (e) {
      console.error('Worker error', e);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

if (require.main === module) {
  loop().catch((e) => {
    console.error('Fatal worker error', e);
    process.exit(1);
  });
}
