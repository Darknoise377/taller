import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { generateText } from 'ai';
import { getAIModel } from '@/lib/ai-provider';

const WHATSAPP_TOKEN = process.env.WHATSAPP_API_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_ID;
const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION ?? 'v17.0';

export async function sendWhatsAppText(to: string, text: string): Promise<void> {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.warn('[WhatsApp] token or phone id not configured');
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

export async function processWhatsAppMessage(
  sender: string,
  userText: string,
  rawMessage?: unknown,
): Promise<void> {
  // Find or create chat session for this phone number
  let session = await prisma.chatSession.findFirst({ where: { phone: sender } });
  if (!session) {
    session = await prisma.chatSession.create({ data: { phone: sender } });
  }

  // Save incoming user message
  await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      role: 'user',
      content: userText,
      metadata: (rawMessage ?? null) as Prisma.InputJsonValue,
    },
  });

  // Fetch conversation history (last 50 messages for context)
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });

  type ChatHistoryItem = { role: 'user' | 'assistant' | 'system'; content: string };
  const history: ChatHistoryItem[] = messages.map((m) => ({
    role: (m.role === 'user' || m.role === 'assistant' || m.role === 'system') ? m.role : 'user',
    content: m.content,
  }));

  const systemPrompt =
    process.env.WA_AI_SYSTEM_PROMPT ??
    'Eres un asistente de ventas para Motoservicio A&R, una tienda online de repuestos de motos en Colombia. Responde en español, sé amable y conciso.';

  const { text: aiReply } = await generateText({
    model: getAIModel(),
    system: systemPrompt,
    messages: history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    maxTokens: 512,
  });

  // Save assistant reply
  await prisma.chatMessage.create({
    data: { sessionId: session.id, role: 'assistant', content: aiReply },
  });

  // Send reply via WhatsApp
  await sendWhatsAppText(sender, aiReply);
}
