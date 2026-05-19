import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { generateText } from 'ai';
import type { Tool } from '@ai-sdk/provider-utils';
import { z } from 'zod';
import { getAIModel } from '@/lib/ai-provider';
import { PRODUCT_CATEGORIES } from '@/constants/productCategories';

const WHATSAPP_TOKEN = process.env.WHATSAPP_API_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_ID;
const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION ?? 'v17.0';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.motoservicioayr.com';

const WA_SYSTEM_PROMPT = `Eres Mecha, asesor de Almacén y Taller Motoservicio A&R — La Ceja, Antioquia. Hablas como el mecánico de confianza del barrio: directo, cálido, sin rodeos.

━━━ REGLA NÚMERO UNO: BREVEDAD ━━━
Cada respuesta tuya debe caber en un mensaje de WhatsApp.
- Máximo 3 oraciones o una lista corta de productos. Sin introducción, sin despedida, sin relleno.
- Si necesitas hacer una pregunta: UNA sola pregunta, al final.
- Nunca expliques lo que vas a hacer. Hazlo y ya.
- Cero emojis decorativos salvo el 👉 para enlaces de producto.

━━━ BÚSQUEDA OBLIGATORIA ━━━
- SIEMPRE llama a searchProducts antes de responder sobre productos o stock.
- Si no hay resultados, prueba términos alternativos (singular/plural/marca).
- Nunca digas "no tenemos" sin haber buscado primero.

━━━ MOSTRAR PRODUCTOS ━━━
Muestra máximo 3 resultados. Formato fijo:
  *Nombre* — $precio COP (stock: X uds)
  👉 ${BASE_URL}/products/[id]
Si el stock es ≤ 3, agrega "(¡últimas unidades!)" en la misma línea.
Sin tablas, sin headers, sin listas anidadas.

━━━ DATOS TIENDA ━━━
Dirección: Calle 27 #14-29, La Ceja — WhatsApp: 301 527 1104 — L–S 8am–6pm
Categorías: ${PRODUCT_CATEGORIES.join(', ')}

Sin stock tras buscar → "No lo tenemos ahora. Escríbenos al 301 527 1104 para confirmar reabastecimiento."
Fuera de tema → "Solo manejo motos y repuestos — ¿en qué te ayudo?"`;

const searchParamsSchema = z.object({
  query: z.string().describe('Términos de búsqueda, ej: "pastillas de freno cb190"'),
  category: z.string().optional().describe(`Categoría opcional. Opciones: ${PRODUCT_CATEGORIES.join(', ')}`),
  maxResults: z.number().int().min(1).max(5).optional().default(3),
});

type SearchParams = z.infer<typeof searchParamsSchema>;

type SearchResult = {
  found: boolean;
  message?: string;
  total?: number;
  products: Array<{
    id: string;
    name: string;
    price: string;
    category: string;
    stock: number;
    sku: string | null;
    url: string;
  }>;
};

const searchProductsTool: Tool<SearchParams, SearchResult> = {
  description: 'Busca productos en el catálogo de la tienda. Úsalo siempre que el cliente pregunte por un repuesto.',
  inputSchema: searchParamsSchema,
  execute: async ({ query, category, maxResults }: SearchParams): Promise<SearchResult> => {
    const limit = maxResults ?? 3;
    const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const singulars = words.map((w) => (w.endsWith('s') ? w.slice(0, -1) : w));
    const allTerms = [...new Set([...words, ...singulars])];

    try {
      const products = await prisma.product.findMany({
        where: {
          stock: { gt: 0 },
          AND: [
            {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                ...allTerms.map((t) => ({ name: { contains: t, mode: 'insensitive' as const } })),
                ...allTerms.map((t) => ({ description: { contains: t, mode: 'insensitive' as const } })),
                ...(allTerms.length > 0 ? [{ tags: { hasSome: allTerms } }] : []),
              ],
            },
            ...(category ? [{ category: category as never }] : []),
          ],
        },
        take: limit,
        select: { id: true, name: true, price: true, currency: true, category: true, stock: true, sku: true },
        orderBy: { stock: 'desc' },
      });

      if (products.length === 0) {
        return { found: false, message: 'No se encontraron productos con ese criterio.', products: [] };
      }

      return {
        found: true,
        total: products.length,
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          price: new Intl.NumberFormat('es-CO', { style: 'currency', currency: p.currency ?? 'COP', minimumFractionDigits: 0 }).format(p.price),
          category: p.category as string,
          stock: p.stock,
          sku: p.sku ?? null,
          url: `${BASE_URL}/products/${p.id}`,
        })),
      };
    } catch {
      return { found: false, message: 'Error al consultar el catálogo.', products: [] };
    }
  },
};

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

  const systemPrompt = process.env.WA_AI_SYSTEM_PROMPT ?? WA_SYSTEM_PROMPT;

  const { text: aiReply } = await generateText({
    model: getAIModel(),
    system: systemPrompt,
    messages: history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    tools: { searchProducts: searchProductsTool },
    maxSteps: 5,
  });

  // Save assistant reply
  await prisma.chatMessage.create({
    data: { sessionId: session.id, role: 'assistant', content: aiReply },
  });

  // Send reply via WhatsApp
  await sendWhatsAppText(sender, aiReply);
}
