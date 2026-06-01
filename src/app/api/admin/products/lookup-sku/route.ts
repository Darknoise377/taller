import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateText } from 'ai';
import { verifyAdminToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/config/admin';
import { getAIModel } from '@/lib/ai-provider';
import { PRODUCT_CATEGORIES } from '@/constants/productCategories';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try { await verifyAdminToken(token); return true; } catch { return null; }
}

export const maxDuration = 30;

export interface SkuLookupResult {
  name?: string;
  description?: string;
  category?: string;
  brand?: string;
  tags?: string[];
  sizes?: string[];
  diagramNumber?: string;
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await req.json() as { reference?: string };
  const reference = body.reference?.trim();

  if (!reference) {
    return NextResponse.json({ error: 'El código de referencia es requerido' }, { status: 400 });
  }

  const validCategories = PRODUCT_CATEGORIES.join(', ');

  const prompt = `Eres un experto en repuestos y accesorios para motocicletas en Colombia. Tu tarea es identificar un repuesto a partir de su código de referencia o SKU y devolver sus datos en formato JSON.

Código de referencia a identificar: "${reference}"

Devuelve ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional, sin markdown, sin explicaciones):
{
  "name": "Nombre comercial completo del repuesto",
  "description": "Descripción breve persuasiva en español (máximo 2 oraciones, para tienda online)",
  "category": "una de estas categorías exactas: ${validCategories}",
  "brand": "marca del fabricante si se puede identificar, null si no",
  "tags": ["etiqueta1", "etiqueta2", "etiqueta3"],
  "sizes": ["compatibilidad1", "compatibilidad2"],
  "diagramNumber": "número en diagrama si aplica, null si no",
  "confidence": "high si estás seguro, medium si es probable, low si estás especulando",
  "notes": "nota corta para el administrador si hay algo importante, null si no"
}

Reglas:
- "name" debe ser descriptivo y útil para vender (ej: "Cilindro completo AKT 125 - STD")
- "category" DEBE ser exactamente uno de los valores permitidos
- "tags" máximo 5 etiquetas relevantes en minúsculas
- "sizes" = modelos de moto compatibles o medidas técnicas que conozcas
- Si el código parece una referencia de moto (ej: FZ16, NKD125), identifica partes comunes
- Si no puedes identificar el repuesto con certeza, igual devuelve lo que puedas con confidence "low"
- Siempre devuelve JSON válido aunque la información sea parcial`;

  try {
    const { text } = await generateText({
      model: getAIModel(),
      prompt,
    });

    // Extract JSON from the response (model might wrap it in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'No se pudo interpretar la respuesta de la IA. Intenta con una referencia más específica.' },
        { status: 422 }
      );
    }

    const result = JSON.parse(jsonMatch[0]) as SkuLookupResult;

    // Validate that category is a known value
    if (result.category && !PRODUCT_CATEGORIES.includes(result.category as typeof PRODUCT_CATEGORIES[number])) {
      result.category = undefined;
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[lookup-sku] error:', err);
    return NextResponse.json(
      { error: 'Error al consultar la IA. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
