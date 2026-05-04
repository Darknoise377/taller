import { generateObject } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAIModel } from '@/lib/ai-provider';
import { rateLimit } from '@/lib/rateLimit';
import { PRODUCT_CATEGORIES } from '@/constants/productCategories';

export const maxDuration = 20;

// Schema que el modelo debe devolver
const SearchIntentSchema = z.object({
  keywords: z
    .array(z.string())
    .describe('Palabras clave del producto a buscar, máximo 5 términos'),
  category: z
    .enum([...PRODUCT_CATEGORIES] as [string, ...string[]])
    .nullable()
    .describe('Categoría del producto si se puede inferir, o null'),
  minPrice: z.number().nullable().describe('Precio mínimo en COP si se menciona, o null'),
  maxPrice: z.number().nullable().describe('Precio máximo en COP si se menciona, o null'),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 3) {
    return Response.json({ error: 'El parámetro q es requerido (mín. 3 caracteres)' }, { status: 400 });
  }

  // Rate limit: 30 búsquedas / minuto por IP
  const rl = rateLimit(req, { keyPrefix: 'ai-search', windowMs: 60_000, max: 30 });
  if (!rl.ok) {
    return Response.json(
      { error: 'Demasiadas solicitudes.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds ?? 10) } }
    );
  }

  let intent: z.infer<typeof SearchIntentSchema>;

  try {
    const model = getAIModel();
    const { object } = await generateObject({
      model,
      schema: SearchIntentSchema,
      prompt: `Analiza esta búsqueda de repuestos para moto en una tienda colombiana y extrae la intención:
"${q}"

Categorías disponibles: ${PRODUCT_CATEGORIES.join(', ')}

Extrae las palabras clave más relevantes para buscar en un catálogo, la categoría si aplica y rango de precios si se mencionan.`,
    });
    intent = object;
  } catch {
    // Si la IA falla (sin API key, cuota, etc.), hacer búsqueda textual simple
    intent = { keywords: q.split(/\s+/).slice(0, 5), category: null, minPrice: null, maxPrice: null };
  }

  try {
    const { keywords, category, minPrice, maxPrice } = intent;
    const searchText = keywords.join(' ');

    const products = await prisma.product.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: searchText, mode: 'insensitive' } },
              { description: { contains: searchText, mode: 'insensitive' } },
              // También buscar cada keyword individualmente
              ...keywords.map((kw) => ({ name: { contains: kw, mode: 'insensitive' as const } })),
              ...keywords.map((kw) => ({
                description: { contains: kw, mode: 'insensitive' as const },
              })),
              ...(keywords.length > 0 ? [{ tags: { hasSome: keywords } }] : []),
            ],
          },
          ...(category ? [{ category: category as never }] : []),
          ...(minPrice != null ? [{ price: { gte: minPrice } }] : []),
          ...(maxPrice != null ? [{ price: { lte: maxPrice } }] : []),
        ],
      },
      take: 20,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        currency: true,
        imageUrl: true,
        images: true,
        category: true,
        sizes: true,
        colors: true,
        stock: true,
        sku: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ stock: 'desc' }, { createdAt: 'desc' }],
    });

    return Response.json({
      query: q,
      intent: { keywords: intent.keywords, category: intent.category },
      total: products.length,
      items: products,
    });
  } catch (err) {
    console.error('[/api/search] DB error:', err);
    return Response.json({ error: 'Error al consultar el catálogo' }, { status: 500 });
  }
}
