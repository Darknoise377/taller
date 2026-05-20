import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { PaymentMethod } from '@prisma/client';
import { streamText, stepCountIs } from 'ai';
import type { Tool } from '@ai-sdk/provider-utils';
import { z } from 'zod';
import { getAIModel } from '@/lib/ai-provider';
import { PRODUCT_CATEGORIES } from '@/constants/productCategories';
import { buildWompiIntegritySignature } from '@/lib/payments/wompi';

const WHATSAPP_TOKEN = process.env.WHATSAPP_API_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_ID;
const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION ?? 'v17.0';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.motoservicioayr.com';

const WA_SYSTEM_PROMPT = `Eres Mecha, asesor de Almacén y Taller Motoservicio A&R — La Ceja, Antioquia. Eres el mecánico de confianza del barrio: directo, cálido, empático y sin rodeos. Le hablas a la gente como si los conocieras de toda la vida.

━━━ TONO Y EMPATÍA ━━━
- Reconoce el problema del cliente antes de ofrecer una solución. Si la moto está varada, dilo: "Qué fastidio, pero tiene solución."
- Usa español colombiano natural: "listo", "claro que sí", "con mucho gusto", "no te preocupes".
- Si el cliente está frustrado o urgente, valídalo primero en una frase breve, luego ve al grano.
- No suenes a bot ni a menú de call center. Sé humano.

━━━ BREVEDAD (WhatsApp) ━━━
- Máximo 3 oraciones o una lista corta de productos por mensaje.
- UNA sola pregunta al final, nunca varias a la vez.
- Nunca expliques lo que vas a hacer. Hazlo y ya.
- Sin emojis decorativos, solo el 👉 para enlaces.

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
IMPORTANTE: el enlace 👉 va solo en su línea, sin paréntesis, sin corchetes, sin nada más.

━━━ CREAR PEDIDO ━━━
Recopila los datos uno a la vez, en conversación natural:
1. Confirma producto + cantidad (con searchProducts primero)
2. Nombre completo
3. Email
4. Teléfono
5. Dirección de entrega
6. Ciudad y departamento
7. Pago: CONTRAENTREGA (paga al recibir) o WOMPI (pago online)
Luego llama a createOrder. Si elige WOMPI, comparte el enlace de pago que retorna la herramienta.
Si la orden se crea exitosamente: confirma con el código de referencia y el total.

━━━ DATOS TIENDA ━━━
Dirección: Calle 27 #14-29, La Ceja — WhatsApp: 301 527 1104 — L–S 8am–6pm
Categorías: ${PRODUCT_CATEGORIES.join(', ')}

Sin stock tras buscar → "No lo tenemos ahora. Escríbenos al 301 527 1104 para confirmar reabastecimiento."
Fuera de tema → "Solo manejo motos y repuestos — ¿en qué te ayudo?"

━━━ EJEMPLOS ━━━
CLIENTE: "se me dañó la moto y no arranca"
MECHA: Qué mal momento, pero vamos a resolverlo. ¿Hace algún ruido cuando intentas arrancarla?

CLIENTE: "necesito pastillas de freno para la cb190"
MECHA: [llama searchProducts → encuentra resultado]
*Pastillas de Freno Honda CB190* — $28.000 COP (stock: 7 uds)
👉 ${BASE_URL}/products/[id]
¿Las pedimos?

CLIENTE: "sí, las quiero"
MECHA: Listo. ¿Me das tu nombre completo para el pedido?`;

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

// ── createOrder ─────────────────────────────────────────────────────────────

const createOrderParamsSchema = z.object({
  customerName: z.string().describe('Nombre completo del cliente'),
  customerEmail: z.string().email().describe('Email del cliente'),
  phone: z.string().describe('Teléfono del cliente'),
  address: z.string().describe('Dirección de entrega'),
  city: z.string().describe('Ciudad de entrega'),
  department: z.string().optional().describe('Departamento de entrega'),
  paymentMethod: z
    .enum(['CONTRAENTREGA', 'WOMPI'])
    .describe('Método de pago: CONTRAENTREGA (pago al recibir) o WOMPI (pago online)'),
  products: z
    .array(
      z.object({
        productId: z.string().describe('ID del producto (obtenido con searchProducts)'),
        quantity: z.number().int().positive().describe('Cantidad a pedir'),
      }),
    )
    .min(1)
    .describe('Lista de productos con su ID y cantidad'),
});

type CreateOrderParams = z.infer<typeof createOrderParamsSchema>;

type CreateOrderResult = {
  success: boolean;
  referenceCode?: string;
  total?: string;
  paymentMethod?: string;
  wompiPaymentUrl?: string;
  error?: string;
};

const createOrderTool: Tool<CreateOrderParams, CreateOrderResult> = {
  description:
    'Crea una orden de compra con los datos del cliente. Llámala solo cuando tengas TODOS los datos: nombre, email, teléfono, dirección, ciudad, método de pago y productos.',
  inputSchema: createOrderParamsSchema,
  execute: async (params: CreateOrderParams): Promise<CreateOrderResult> => {
    try {
      const quantitiesByProductId = new Map<string, number>();
      for (const item of params.products) {
        const id = item.productId.trim();
        quantitiesByProductId.set(id, (quantitiesByProductId.get(id) ?? 0) + item.quantity);
      }
      const productIds = Array.from(quantitiesByProductId.keys());

      const dbProducts = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, price: true, stock: true, currency: true },
      });

      if (dbProducts.length !== productIds.length) {
        return { success: false, error: 'Uno o más productos no existen en el catálogo.' };
      }

      let subtotal = 0;
      for (const p of dbProducts) {
        const qty = quantitiesByProductId.get(p.id) ?? 0;
        if (p.stock < qty) {
          return { success: false, error: `No hay suficiente stock para el producto ${p.id}.` };
        }
        subtotal += Number(p.price) * qty;
      }

      const total = Math.round(subtotal * 100) / 100;
      const currency = dbProducts[0]?.currency ?? 'COP';
      const referenceCode = `AR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const paymentMethod = params.paymentMethod as PaymentMethod;

      const order = await prisma.order.create({
        data: {
          referenceCode,
          total,
          currency,
          paymentMethod,
          customerName: params.customerName,
          customerEmail: params.customerEmail,
          address: params.address,
          city: params.city,
          department: params.department ?? null,
          phone: params.phone,
          status: 'PENDING',
          products: {
            create: Array.from(quantitiesByProductId.entries()).map(([productId, quantity]) => {
              const p = dbProducts.find((d) => d.id === productId)!;
              return { productId, quantity, unitPrice: Number(p.price) };
            }),
          },
        },
      });

      const totalFormatted = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
      }).format(order.total);

      let wompiPaymentUrl: string | undefined;
      if (paymentMethod === 'WOMPI') {
        const publicKey = process.env.WOMPI_PUBLIC_KEY;
        const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
        const checkoutBase = process.env.WOMPI_CHECKOUT_URL ?? 'https://checkout.wompi.co/p/';

        if (publicKey && integritySecret) {
          const amountInCents = Math.round(Number(order.total) * 100);
          const redirectUrl = new URL('/checkout/response', BASE_URL);
          redirectUrl.searchParams.set('referenceCode', order.referenceCode);
          redirectUrl.searchParams.set('provider', 'wompi');

          const integrity = buildWompiIntegritySignature({
            reference: order.referenceCode,
            amountInCents,
            currency,
            integritySecret,
          });

          const checkoutUrl = new URL(checkoutBase);
          checkoutUrl.searchParams.set('public-key', publicKey);
          checkoutUrl.searchParams.set('currency', currency);
          checkoutUrl.searchParams.set('amount-in-cents', String(amountInCents));
          checkoutUrl.searchParams.set('reference', order.referenceCode);
          checkoutUrl.searchParams.set('redirect-url', redirectUrl.toString());
          checkoutUrl.searchParams.set('signature:integrity', integrity);
          checkoutUrl.searchParams.set('customer-data:email', order.customerEmail);
          checkoutUrl.searchParams.set('customer-data:full-name', order.customerName);
          checkoutUrl.searchParams.set('customer-data:phone-number', order.phone);

          wompiPaymentUrl = checkoutUrl.toString();
        }
      }

      return {
        success: true,
        referenceCode: order.referenceCode,
        total: totalFormatted,
        paymentMethod: paymentMethod === 'WOMPI' ? 'Pago online (Wompi)' : 'Contraentrega',
        wompiPaymentUrl,
      };
    } catch (err) {
      console.error('[createOrder WA]', err);
      return { success: false, error: 'No se pudo crear la orden. Intenta de nuevo.' };
    }
  },
};

// ── searchProducts ────────────────────────────────────────────────────────────

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

// Few-shot examples that teach the model to always call searchProducts before answering
// about products. Mirrors the FEW_SHOT_MESSAGES pattern from api/chat/route.ts.
const WA_FEW_SHOT: Array<{ role: 'user' | 'assistant'; content: string }> = [
  { role: 'user', content: '¿A qué hora abren?' },
  { role: 'assistant', content: 'Lunes a sábado 8am–6pm. Calle 27 #14-29, La Ceja.' },
  { role: 'user', content: 'Necesito pastillas de freno para la cb190' },
  { role: 'assistant', content: '[llama searchProducts → resultado encontrado]\n*Pastillas de Freno Honda CB190* — $28.000 COP (stock: 7 uds)\n👉 ' + BASE_URL + '/products/ejemplo\n¿Las pedimos?' },
  { role: 'user', content: 'Cuánto cuesta un vuelo a Bogotá' },
  { role: 'assistant', content: 'Solo manejo motos y repuestos — ¿en qué te ayudo?' },
  { role: 'user', content: 'Se me dañó la moto y no arranca' },
  { role: 'assistant', content: 'Qué mal momento, pero tiene solución. ¿Hace algún ruido cuando intentas arrancarla?' },
];

// Fallback message text — used to filter polluted history entries
const FALLBACK_MSG = 'Tuve un problema procesando tu mensaje. Por favor intenta de nuevo.';

async function sendWhatsAppText(to: string, text: string): Promise<void> {
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

  // Fetch conversation history — only the 8 most recent VALID messages.
  // Keep the window small: large/polluted history causes timeouts and bad responses.
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: 'desc' },
    take: 30, // over-fetch so we have enough after filtering
  });

  type ChatHistoryItem = { role: 'user' | 'assistant'; content: string };

  // Bad responses to exclude: fallback errors, single-char garbage, known wrong phrases.
  const BAD_PATTERNS = [
    FALLBACK_MSG,
    '?',
    '¡A la orden!',
    '¡Mucho gusto!',
    'Siempre a la orden.',
    'Estoy para ayudarte con tus repuestos y dudas.',
  ];

  const history: ChatHistoryItem[] = messages
    .reverse()
    .filter(
      (m) =>
        (m.role === 'user' || m.role === 'assistant') &&
        !BAD_PATTERNS.includes(m.content.trim()) &&
        m.content.trim().length > 0,
    )
    .slice(-8) // keep only last 8 clean messages
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  const systemPrompt = process.env.WA_AI_SYSTEM_PROMPT ?? WA_SYSTEM_PROMPT;

  // Prepend few-shot examples so the model sees correct tool-usage patterns
  // before the real conversation history.
  const stream = streamText({
    model: getAIModel(),
    system: systemPrompt,
    messages: [...WA_FEW_SHOT, ...history],
    tools: { searchProducts: searchProductsTool, createOrder: createOrderTool },
    stopWhen: stepCountIs(8),
  });

  // streamText.text resolves to the full accumulated text after all tool steps complete.
  // generateText was returning empty text when the last step was a tool call in AI SDK v6.
  const rawReply = await stream.text;

  const aiReply =
    rawReply.trim() ||
    FALLBACK_MSG;

  // Strip trailing ) the model sometimes adds after product URLs (markdown artifact)
  const cleanedReply = aiReply.replace(/^(👉\s+https?:\/\/[^\s)]+)\)*\s*$/gm, '$1');

  // Save assistant reply
  await prisma.chatMessage.create({
    data: { sessionId: session.id, role: 'assistant', content: cleanedReply },
  });

  // Send reply via WhatsApp
  await sendWhatsAppText(sender, cleanedReply);
}
