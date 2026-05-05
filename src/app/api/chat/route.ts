import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import type { Tool } from '@ai-sdk/provider-utils';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAIModel } from '@/lib/ai-provider';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { PRODUCT_CATEGORIES } from '@/constants/productCategories';
import type { UIMessage } from 'ai';

export const maxDuration = 30;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

const SYSTEM_PROMPT = `Eres el asistente virtual de Almacén y Taller Motoservicio A&R, una tienda especializada en repuestos y accesorios para motos en La Ceja, Antioquia, Colombia.

REGLA CRÍTICA — búsqueda obligatoria:
- SIEMPRE llama a searchProducts ANTES de responder cualquier pregunta sobre productos, repuestos o disponibilidad.
- Nunca digas "no tenemos" o "no hay stock" sin haber llamado primero a searchProducts.
- Si la primera búsqueda no retorna resultados, intenta con términos alternativos (singular, plural, marca, categoría).
- Ejemplo: si el cliente pregunta por "cilindros", busca también "cilindro".

Tu rol:
- Ayudas a los clientes a encontrar repuestos, accesorios y partes para sus motos
- Orientas sobre compatibilidad básica, mantenimiento y precios en COP
- Eres amable, conciso y respondes siempre en español colombiano

Datos de la tienda:
- Dirección: Calle 21 #14-29, La Ceja, Antioquia
- WhatsApp: 301 527 1104
- Horario: Lunes a Sábado 8am–6pm

Categorías disponibles: ${PRODUCT_CATEGORIES.join(', ')}

Instrucciones de respuesta:
- Máximo 3 párrafos cortos
- Cuando encuentres productos disponibles, presenta SIEMPRE:
  1. Nombre y precio
  2. Stock disponible
  3. Enlace para ver y comprar: ${BASE_URL}/products/[id del producto]
  Ejemplo: "Ver producto y agregar al carrito: ${BASE_URL}/products/abc123"
- Si definitivamente no hay stock después de buscar, sugiere contactar por WhatsApp al 301 527 1104
- Nunca inventes precios ni referencias; usa solo datos del catálogo`;

const searchParamsSchema = z.object({
  query: z
    .string()
    .describe('Términos de búsqueda del producto, ej: "pastillas de freno" o "filtro aceite honda"'),
  category: z
    .string()
    .optional()
    .describe(`Categoría del producto. Opciones: ${PRODUCT_CATEGORIES.join(', ')}`),
  maxResults: z.number().int().min(1).max(8).optional().default(5),
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
  description:
    'Busca productos disponibles en el catálogo de la tienda por nombre, categoría o descripción. Úsalo cuando el cliente pregunte por un repuesto o accesorio.',
  inputSchema: searchParamsSchema,
  execute: async ({ query, category, maxResults }: SearchParams): Promise<SearchResult> => {
    const limit = maxResults ?? 5;
    // Build search terms: query completa + palabras individuales + variante sin 's' final (plural→singular)
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);
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
                // Búsqueda por cada palabra individual (singular y plural)
                ...allTerms.map((term) => ({ name: { contains: term, mode: 'insensitive' as const } })),
                ...allTerms.map((term) => ({ description: { contains: term, mode: 'insensitive' as const } })),
                ...(allTerms.length > 0 ? [{ tags: { hasSome: allTerms } }] : []),
              ],
            },
            ...(category ? [{ category: category as never }] : []),
          ],
        },
        take: limit,
        select: {
          id: true,
          name: true,
          price: true,
          currency: true,
          category: true,
          stock: true,
          sku: true,
        },
        orderBy: { stock: 'desc' },
      });

      if (products.length === 0) {
        return {
          found: false,
          message: 'No se encontraron productos con ese criterio en este momento.',
          products: [],
        };
      }

      return {
        found: true,
        total: products.length,
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          price: new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: p.currency ?? 'COP',
            minimumFractionDigits: 0,
          }).format(p.price),
          category: p.category as string,
          stock: p.stock,
          sku: p.sku ?? null,
          url: `/products/${p.id}`,
        })),
      };
    } catch {
      return { found: false, message: 'Error al consultar el catálogo.', products: [] };
    }
  },
};

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit(req, { keyPrefix: 'chat', windowMs: 60_000, max: 20 });
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.' }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfterSeconds ?? 10) } }
    );
  }

  let body: { messages?: UIMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Cuerpo de solicitud inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const uiMessages: UIMessage[] = Array.isArray(body?.messages) ? body.messages : [];
  const messages = await convertToModelMessages(uiMessages);

  let model;
  try {
    model = getAIModel();
  } catch (e) {
    console.error('[/api/chat] getAIModel failed:', e instanceof Error ? e.message : e);
    console.error('[/api/chat] env check — VERTEX_SA_JSON_BASE64:', process.env.VERTEX_SA_JSON_BASE64 ? `set (${process.env.VERTEX_SA_JSON_BASE64.length} chars)` : 'NOT SET');
    console.error('[/api/chat] env check — VERTEX_PROJECT_ID:', process.env.VERTEX_PROJECT_ID ?? 'NOT SET');
    console.error('[/api/chat] env check — GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'set' : 'NOT SET');
    return new Response(
      JSON.stringify({ error: 'El asistente de IA no está configurado en este momento.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages,
    stopWhen: stepCountIs(5),
    tools: { searchProducts: searchProductsTool },
    onError: (err) => {
      console.error('[/api/chat] streamText error:', err);
    },
  });

  // Log conversation (best-effort, non-blocking)
  void (async () => {
    try {
      // uiMessages is the original array of UIMessage from the request
      const lastUserMsg = [...uiMessages].reverse().find((m) => m.role === 'user');
      if (lastUserMsg) {
        // Extract text content from parts (v6 UIMessage format)
        type TextPart = { type: string; text?: string };
        const textContent = Array.isArray(lastUserMsg.parts)
          ? (lastUserMsg.parts as TextPart[])
              .filter((p) => p.type === 'text')
              .map((p) => p.text ?? '')
              .join('')
          : '';
        if (textContent) {
          let session = await prisma.chatSession.findFirst({
            where: { userId: `ip:${ip}` },
            orderBy: { createdAt: 'desc' },
          });
          if (!session) {
            session = await prisma.chatSession.create({ data: { userId: `ip:${ip}` } });
          }
          await prisma.chatMessage.create({
            data: { sessionId: session.id, role: 'user', content: textContent },
          });
        }
      }
    } catch {
      // Non-critical — don't block the response
    }
  })();

  return result.toUIMessageStreamResponse();
}
