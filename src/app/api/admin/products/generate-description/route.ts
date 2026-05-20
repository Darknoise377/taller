import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateText } from 'ai';
import { verifyAdminToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/config/admin';
import { getAIModel } from '@/lib/ai-provider';
import { getProductCategoryLabel } from '@/constants/productCategories';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try { await verifyAdminToken(token); return true; } catch { return null; }
}

export const maxDuration = 30;

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await req.json() as {
    name?: string;
    category?: string;
    brand?: string;
    sku?: string;
    tags?: string[];
  };

  const { name, category, brand, sku, tags } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'El nombre del producto es requerido' }, { status: 400 });
  }

  const categoryLabel = category ? getProductCategoryLabel(category) : null;
  const context = [
    `Producto: ${name.trim()}`,
    categoryLabel ? `Categoría: ${categoryLabel}` : null,
    brand ? `Marca: ${brand}` : null,
    sku ? `SKU/Referencia: ${sku}` : null,
    tags?.length ? `Etiquetas: ${tags.join(', ')}` : null,
  ].filter(Boolean).join('\n');

  const prompt = `Eres un experto en ventas de repuestos y accesorios para motos en Colombia.
Genera una descripción de producto para una tienda online de repuestos de motos llamada "Motoservicio A&R".

La descripción debe:
- Ser persuasiva, llamar a la compra, transmitir confianza
- Destacar que es pieza original/genérica de calidad
- Mencionar compatibilidad, durabilidad o beneficio clave según el tipo de repuesto
- Ser CORTA: máximo 3 oraciones (60-90 palabras), sin listas, sin puntos de bala
- Usar un tono directo y profesional en español colombiano
- NO incluir precio, ni emojis, ni mencionar el nombre de la tienda

Información del producto:
${context}

Responde ÚNICAMENTE con el texto de la descripción, sin comillas, sin introducción, sin explicaciones.`;

  try {
    const { text } = await generateText({
      model: getAIModel(),
      prompt,
      maxTokens: 200,
    });

    return NextResponse.json({ description: text.trim() });
  } catch (err) {
    console.error('[generate-description] AI error:', err);
    return NextResponse.json(
      { error: 'Error al generar descripción. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
