import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateText } from 'ai';
import { verifyAdminToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/config/admin';
import { getAIModel } from '@/lib/ai-provider';

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

  const body = await req.json() as { imageUrl?: string };

  if (!body.imageUrl?.trim()) {
    return NextResponse.json({ error: 'Se requiere imageUrl' }, { status: 400 });
  }

  const prompt = `Eres un copywriter experto en ventas de repuestos y accesorios para motos en Colombia, especializado en crear textos que generan deseo de compra inmediato.

Analiza la imagen de un COMBO de productos de la tienda "Motoservicio A&R" y genera contenido de venta de alto impacto.

REGLAS para el NOMBRE (máximo 6 palabras):
- Usa palabras de poder: "Kit", "Combo", "Pack", "Premium", "Pro", "Completo", "Total", "Esencial"
- Menciona el beneficio principal o los productos clave
- Ejemplo bueno: "Kit Mantenimiento Completo Premium", "Combo Frenos Pro + Regalo"
- Ejemplo malo: "Combo de productos varios"

REGLAS para la DESCRIPCIÓN (exactamente 3 oraciones, 55-75 palabras):
- Oración 1: Menciona los productos específicos que ves en la imagen y el beneficio principal que le dan al motero — qué problema le resuelven o qué mejoran en la moto. Sé concreto con los productos que ves.
- Oración 2: Urgencia o escasez + valor del ahorro (ej: "Ahorra hasta un 30% comprando en combo versus piezas individuales — stock limitado.")
- Oración 3: Mención del regalo sorpresa como gancho final (ej: "Incluye un regalo sorpresa exclusivo revelado al momento de tu compra.")
- Tono: directo, confiable, con energía. Nada genérico. Habla como vendedor colombiano que conoce motos y le habla al cliente de tú.
- Usa verbos de acción: "protege", "garantiza", "ahorra", "mantén", "lleva", "asegura"
- NO uses emojis, NO menciones precios, NO repitas el nombre del combo.

Responde ÚNICAMENTE en este formato JSON exacto (sin markdown, sin bloques de código):
{"name":"...","description":"..."}`;

  try {
    const model = getAIModel();
    const { text } = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image', image: new URL(body.imageUrl) },
          ],
        },
      ],
    });

    // Parse JSON from AI response
    const cleaned = text.trim().replace(/^```json?\s*/i, '').replace(/```\s*$/i, '');
    const parsed = JSON.parse(cleaned) as { name?: string; description?: string };

    if (!parsed.name || !parsed.description) {
      throw new Error('Respuesta incompleta de IA');
    }

    return NextResponse.json({ name: parsed.name.trim(), description: parsed.description.trim() });
  } catch (err) {
    console.error('[analyze-combo-image]', err);
    return NextResponse.json({ error: 'Error al analizar la imagen con IA' }, { status: 500 });
  }
}
