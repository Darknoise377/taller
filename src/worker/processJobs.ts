/* Worker: poll jobs from DB and process them.
   Run locally with: `npx ts-node src/worker/processJobs.ts` or compile to JS.
*/
import { prisma } from '@/lib/prisma';
import sendToAI from '@/lib/ai';

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
    const payload: any = job.payload;
    if (job.type === 'whatsapp_message') {
      const sender = payload.sender;
      const userText = payload.userText;

      // find or create session
      let session = await prisma.chatSession.findFirst({ where: { phone: sender } });
      if (!session) {
        session = await prisma.chatSession.create({ data: { phone: sender } });
      }

      // save user message
      await prisma.chatMessage.create({ data: { sessionId: session.id, role: 'user', content: userText, metadata: payload.raw } });

      // fetch history (last 20 messages)
      const messages = await prisma.chatMessage.findMany({ where: { sessionId: session.id }, orderBy: { createdAt: 'asc' }, take: 50 });
      const history = messages.map((m) => ({ role: m.role as any, content: m.content }));

      const systemPrompt = process.env.WA_AI_SYSTEM_PROMPT ?? 'Eres un asistente de ventas para una tienda online. Responde en español, sé amable y conciso.';

      const aiReply = await sendToAI({ userText, systemPrompt, history });

      // save assistant reply
      await prisma.chatMessage.create({ data: { sessionId: session.id, role: 'assistant', content: aiReply } });

      // send via WhatsApp
      await sendWhatsAppText(sender, aiReply);
    }

    await prisma.job.update({ where: { id: job.id }, data: { status: 'COMPLETED', processedAt: new Date() } });
    return true;
  } catch (err) {
    console.error('Job processing failed:', err);
    await prisma.job.update({ where: { id: job.id }, data: { status: 'FAILED' } });
    return true; // job consumed
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
