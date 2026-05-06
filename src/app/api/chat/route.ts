import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import type { Tool } from '@ai-sdk/provider-utils';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { PaymentMethod } from '@prisma/client';
import { getAIModel } from '@/lib/ai-provider';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { PRODUCT_CATEGORIES } from '@/constants/productCategories';
import { buildWompiIntegritySignature } from '@/lib/payments/wompi';
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
- Puedes crear órdenes de compra directamente desde el chat cuando el cliente lo solicite
- Eres amable, conciso y respondes siempre en español colombiano

Datos de la tienda:
- Dirección: Calle 21 #14-29, La Ceja, Antioquia
- WhatsApp: 301 527 1104
- Horario: Lunes a Sábado 8am–6pm

Categorías disponibles: ${PRODUCT_CATEGORIES.join(', ')}

FLUJO PARA CREAR UNA ORDEN:
Cuando el cliente quiera hacer un pedido, guíalo paso a paso y recopila TODOS estos datos antes de llamar a createOrder:
1. Nombre completo
2. Email
3. Teléfono
4. Dirección completa (calle, número)
5. Ciudad y departamento
6. Productos: usa searchProducts para encontrarlos y confirma los IDs exactos con el cliente
7. Método de pago: CONTRAENTREGA (pago al recibir) o WOMPI (pago en línea seguro con tarjeta/PSE/Nequi)

Una vez tengas todos los datos, llama a createOrder. Si el cliente eligió WOMPI, comparte el enlace de pago que retorna la herramienta.
Si eligió CONTRAENTREGA, confirma la orden y el número de referencia.

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

// ──────────────────────────────────────────────
// Tool: createOrder
// ──────────────────────────────────────────────
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
    'Crea una orden de compra en la tienda con los datos del cliente y los productos seleccionados. Llama a esta herramienta solo cuando tengas TODOS los datos necesarios.',
  inputSchema: createOrderParamsSchema,
  execute: async (params: CreateOrderParams): Promise<CreateOrderResult> => {
    try {
      // Consolidar productos
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

      // Generar referenceCode único
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

      // Generar link de pago Wompi si aplica
      let wompiPaymentUrl: string | undefined;
      if (paymentMethod === 'WOMPI') {
        const publicKey = process.env.WOMPI_PUBLIC_KEY;
        const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
        const checkoutBase = process.env.WOMPI_CHECKOUT_URL ?? 'https://checkout.wompi.co/p/';
        const baseUrl = BASE_URL;

        if (publicKey && integritySecret) {
          const amountInCents = Math.round(Number(order.total) * 100);
          const redirectUrl = new URL('/checkout/response', baseUrl);
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
      console.error('[createOrder tool]', err);
      return { success: false, error: 'No se pudo crear la orden. Intenta de nuevo.' };
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
    stopWhen: stepCountIs(8),
    tools: { searchProducts: searchProductsTool, createOrder: createOrderTool },
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
