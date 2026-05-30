import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { PaymentMethod } from '@prisma/client';
import { streamText, stepCountIs } from 'ai';
import type { Tool } from '@ai-sdk/provider-utils';
import { z } from 'zod';
import { getAIModel } from '@/lib/ai-provider';
import { PRODUCT_CATEGORIES } from '@/constants/productCategories';
import {
  createOrderWithStock,
  toAssistantOrderResult,
  generateBrandedReferenceCode,
  CreateOrderError,
} from '@/lib/orders/createOrder';

const WHATSAPP_TOKEN = process.env.WHATSAPP_API_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_ID;
const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION ?? 'v17.0';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.motoservicioayr.com';

const WA_SYSTEM_PROMPT = `Eres Criss, la asesora digital de Almacén y Taller Motoservicio A&R — La Ceja, Antioquia.

━━━ PRESENTACIÓN ━━━
Si no hay historial previo (primera conversación), preséntate así:
"Hola, soy Criss, tu asesora digital de Motoservicio A&R 👋. Con gusto te ayudo. ¿Con quién tengo el gusto?"
Cualquier mensaje corto de saludo — "h", "hola", "ola", "buenas", "hi", "hey", "k tal", "buen día", "buenas tardes", o incluso una sola letra — trátalo como inicio de conversación y responde con la presentación si no hay historial previo.
Una vez conozcas el nombre, úsalo naturalmente en toda la conversación.

━━━ TONO PROFESIONAL ━━━
- Trato respetuoso, cálido y profesional. NUNCA uses "parcero", "parce", "viejo", "loco", "amigo" ni términos que asuman género.
- Usa "usted" de manera natural. Español colombiano: "con mucho gusto", "claro que sí", "no se preocupe", "con todo el gusto".
- Si el cliente está frustrado o urgente, reconócelo en una frase breve antes de dar la solución.
- No suenes a bot ni a menú de call center. Sé humano y cercano.

━━━ BREVEDAD (WhatsApp) ━━━
- Máximo 3 oraciones o una lista corta de productos por mensaje.
- UNA sola pregunta al final de cada mensaje, nunca varias a la vez.
- Nunca expliques lo que vas a hacer. Hazlo directamente.
- Sin emojis decorativos, solo el 👉 para enlaces de productos.

━━━ BÚSQUEDA OBLIGATORIA ━━━
- SIEMPRE llama searchProducts antes de responder sobre productos, precios o disponibilidad.
- Si no hay resultados, prueba términos alternativos (singular/plural/marca/referencia).
- Nunca digas "no tenemos" sin haber buscado primero.

━━━ MOSTRAR PRODUCTOS ━━━
Formato fijo (máximo 3 resultados):
  *Nombre* — $precio COP (stock: X uds)
  👉 URL
Si stock ≤ 3: agrega "(¡son las últimas unidades!)" en la misma línea del nombre.
IMPORTANTE: la URL va sola en su línea, sin paréntesis, sin corchetes, sin nada más.

━━━ CREAR PEDIDO — FLUJO OBLIGATORIO ━━━
Recopila los datos de uno en uno, en orden. NO pidas un dato que ya fue proporcionado en esta conversación.

Orden de recopilación:
1. Confirma producto(s) + cantidad — usa searchProducts para obtener el ID exacto del producto
2. Nombre completo del cliente (puede ya estar disponible del saludo inicial)
3. Cédula de ciudadanía (número de documento de identidad)
4. Email de contacto
5. Teléfono de contacto
6. Dirección de entrega completa
7. Ciudad y departamento
8. Método de pago: CONTRAENTREGA (paga al recibir) o WOMPI (pago en línea seguro)

⚠️ OBLIGATORIO ANTES DE LLAMAR createOrder:
Muestra SIEMPRE este resumen completo y espera confirmación explícita del cliente:

"Revisemos el pedido antes de confirmarlo:

📦 *Producto(s):* [nombre, cantidad y precio unitario de cada ítem]
👤 *Nombre:* [nombre completo]
🪪 *Cédula:* [número de cédula]
📧 *Email:* [email]
📱 *Teléfono:* [teléfono]
📍 *Dirección:* [dirección], [ciudad], [departamento]
💳 *Pago:* [método de pago]
💰 *Total estimado:* [suma de precio × cantidad de todos los productos, en pesos colombianos]

"¿Dime si todo está correcto para confirmar el pedido?"

Solo llama a createOrder cuando el cliente responda afirmativamente ("sí", "confirmo", "listo", "correcto", etc.).
Si el cliente corrige algún dato, actualízalo y muestra el resumen actualizado antes de volver a preguntar.
Tras crear el pedido exitosamente: confirma con el código de referencia, el total y (si eligió WOMPI) el enlace de pago.

━━━ DATOS TIENDA ━━━
Dirección: Calle 27 #14-29, La Ceja — WhatsApp directo: 301 527 1104 — Lunes a sábado 9am–6pm
Categorías disponibles: ${PRODUCT_CATEGORIES.join(', ')}

Sin stock tras buscar → "No lo tenemos en este momento. Pero puedes escribirnos al 301 527 1104 para confirmar existencias o encargos."
Fuera de tema → "Solo manejo motos y repuestos — ¿en qué te puedo ayudar?"`;



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
  cedula: z.string().describe('Número de cédula de ciudadanía del cliente (requerido para el envío)'),
  customerEmail: z.string().email().describe('Email del cliente'),
  phone: z.string().describe('Teléfono del cliente'),
  address: z.string().describe('Dirección de entrega completa'),
  city: z.string().describe('Ciudad de entrega'),
  department: z.string().optional().describe('Departamento de entrega'),
  paymentMethod: z
    .enum(['CONTRAENTREGA', 'WOMPI'])
    .describe('Método de pago: CONTRAENTREGA (paga al recibir) o WOMPI (pago online)'),
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

// Factory: returns a createOrder tool bound to the current session so that
// after a successful order the customer profile (name, cedula, address, etc.)
// is persisted as a 'profile' message and can be pre-filled on the next order.
export function makeCreateOrderTool(sessionId: number): Tool<CreateOrderParams, CreateOrderResult> {
  return {
  description:
    'Crea una orden de compra con los datos del cliente. Llámala solo cuando tengas TODOS los datos: nombre completo, cédula, email, teléfono, dirección, ciudad, método de pago y productos.',
  inputSchema: createOrderParamsSchema,
  execute: async (params: CreateOrderParams): Promise<CreateOrderResult> => {
    try {
      const paymentMethod = params.paymentMethod as PaymentMethod;
      const result = await createOrderWithStock({
        products: params.products,
        paymentMethod,
        customerName: params.customerName,
        customerEmail: params.customerEmail,
        cedula: params.cedula,
        address: params.address,
        city: params.city,
        department: params.department,
        phone: params.phone,
        referenceCode: generateBrandedReferenceCode(),
        sellerCode: 'ASISTENTE_VIRTUAL',
        sendConfirmationEmail: true,
      });

      await prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'profile',
          content: JSON.stringify({
            customerName: params.customerName,
            cedula: params.cedula,
            customerEmail: params.customerEmail,
            phone: params.phone,
            address: params.address,
            city: params.city,
            department: params.department ?? null,
          }),
        },
      });

      return toAssistantOrderResult(result, paymentMethod);
    } catch (err) {
      if (err instanceof CreateOrderError) {
        return { success: false, error: err.message };
      }
      console.error('[createOrder WA]', err);
      return { success: false, error: 'No se pudo crear la orden. Intenta de nuevo.' };
    }
  },
  };
}

// ── searchProducts ────────────────────────────────────────────────────────────

export const searchProductsTool: Tool<SearchParams, SearchResult> = {
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

// Few-shot examples: teach the model the correct patterns for introduction,
// product search, and professional tone. Mirrors FEW_SHOT_MESSAGES from api/chat/route.ts.
export const WA_FEW_SHOT: Array<{ role: 'user' | 'assistant'; content: string }> = [
  {
    role: 'user',
    content: 'Hola',
  },
  {
    role: 'assistant',
    content:
      'Hola, soy Mecha, el asesor digital de Motoservicio A&R 👋. Con gusto le ayudo. ¿Con quién tengo el gusto?',
  },
  {
    role: 'user',
    content: '¿A qué hora abren?',
  },
  {
    role: 'assistant',
    content: 'Lunes a sábado de 8am a 6pm. Estamos en la Calle 27 #14-29, La Ceja.',
  },
  {
    role: 'user',
    content: 'Necesito pastillas de freno para la cb190',
  },
  {
    role: 'assistant',
    content:
      '[llama searchProducts → resultado encontrado]\n*Pastillas de Freno Honda CB190* — $28.000 COP (stock: 7 uds)\n👉 ' +
      BASE_URL +
      '/products/ejemplo\n¿Las pedimos?',
  },
  {
    role: 'user',
    content: 'Cuánto cuesta un vuelo a Bogotá',
  },
  {
    role: 'assistant',
    content: 'Solo manejo motos y repuestos — ¿en qué le puedo ayudar?',
  },
  {
    role: 'user',
    content: 'Se me dañó la moto y no arranca',
  },
  {
    role: 'assistant',
    content: 'Qué mal momento, pero tiene solución. ¿Hace algún ruido cuando intenta arrancarla?',
  },
];

// Fallback message text — used to filter polluted history entries
export const FALLBACK_MSG = 'Tuve un problema procesando tu mensaje. Por favor intenta de nuevo.';

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

  // Fetch conversation history — keep the 30 most recent VALID messages.
  // 30 gives enough room for a full order flow (~18 exchanges) plus interruptions
  // (questions, product changes, corrections) without losing collected data.
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: 'desc' },
    take: 90, // over-fetch so we have enough after filtering
  });

  type ChatHistoryItem = { role: 'user' | 'assistant'; content: string };

  // Exact-match bad responses to exclude: fallback errors, single-char garbage,
  // known wrong phrases from early model failures. Only exact matches — avoids
  // accidentally filtering real user messages.
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
    .slice(-30) // keep only last 30 clean messages
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  // Load the most recent customer profile saved after a previous order.
  // This lets returning customers skip re-entering their name, address, etc.
  const profileMsg = await prisma.chatMessage.findFirst({
    where: { sessionId: session.id, role: 'profile' },
    orderBy: { createdAt: 'desc' },
  });

  let systemPrompt = process.env.WA_AI_SYSTEM_PROMPT ?? WA_SYSTEM_PROMPT;

  if (profileMsg) {
    try {
      const p = JSON.parse(profileMsg.content) as {
        customerName?: string;
        cedula?: string;
        customerEmail?: string;
        phone?: string;
        address?: string;
        city?: string;
        department?: string | null;
      };
      const fields = [
        p.customerName && `Nombre: ${p.customerName}`,
        p.cedula && `Cédula: ${p.cedula}`,
        p.customerEmail && `Email: ${p.customerEmail}`,
        p.phone && `Teléfono: ${p.phone}`,
        p.address && `Dirección: ${p.address}`,
        p.city && `Ciudad: ${p.city}`,
        p.department && `Departamento: ${p.department}`,
      ].filter(Boolean);

      if (fields.length > 0) {
        systemPrompt +=
          `\n\n━━━ DATOS PREVIOS DE ESTE CLIENTE ━━━\n` +
          `Este cliente ya realizó un pedido antes. Sus datos registrados son:\n${fields.join('\n')}\n\n` +
          `Cuando quiera hacer un pedido, muéstrale estos datos y pregunta si siguen siendo correctos. ` +
          `Si confirma, úsalos directamente sin pedirlos de nuevo. Si quiere cambiar alguno, usa el nuevo valor.`;
      }
    } catch {
      // Ignore malformed profile — just proceed without pre-fill
    }
  }

  // Prepend few-shot examples so the model sees correct tool-usage patterns
  // before the real conversation history.
  const stream = streamText({
    model: getAIModel(),
    system: systemPrompt,
    messages: [...WA_FEW_SHOT, ...history],
    tools: { searchProducts: searchProductsTool, createOrder: makeCreateOrderTool(session.id) },
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
