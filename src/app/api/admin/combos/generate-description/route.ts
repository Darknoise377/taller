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

  const body = await req.json() as { name?: string; items?: string[] };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'El nombre del combo es requerido' }, { status: 400 });
  }

  const itemsList = body.items?.length
    ? `\n\nProductos incluidos en el combo:\n${body.items.map((n, i) => `${i + 1}. ${n}`).join('\n')}`
    : '';

  const prompt = `Eres un copywriter experto en ventas de repuestos y accesorios para motos en Colombia, especializado en crear textos que generan deseo de compra inmediato y urgencia real.

Escribe una descripción de venta de alto impacto para un COMBO de la tienda "Motoservicio A&R".

Nombre del combo: "${body.name.trim()}"${itemsList}

ESTRUCTURA OBLIGATORIA (exactamente 3 oraciones, 55-75 palabras en total):
- Oración 1: Menciona los productos específicos que trae el combo y el beneficio principal que le dan al motero — qué problema le resuelven o qué mejoran en su moto. Sé concreto con los productos.
- Oración 2: Refuerza el valor del combo con urgencia o ahorro — por qué es inteligente comprarlo ahora (stock limitado, precio especial, todo incluido en un solo pedido).
- Oración 3: Cierra con el gancho del regalo sorpresa — genera curiosidad y deseo sin revelar qué es.

REGLAS:
- Tono: directo, enérgico, como un vendedor colombiano que conoce motos y le habla al cliente de tú
- Usa verbos de acción: "protege", "garantiza", "ahorra", "mantén", "lleva", "asegura"
- NO uses emojis, NO menciones precios, NO repitas el nombre del combo
- NO seas genérico — menciona los productos reales del combo

Responde ÚNICAMENTE con el texto de la descripción, sin comillas, sin introducción, sin explicaciones.`;

  try {
    const model = getAIModel();
    const { text } = await generateText({ model, prompt });
    const description = text.trim();
    if (!description) throw new Error('Respuesta vacía');
    return NextResponse.json({ description });
  } catch (err) {
    console.error('[combos/generate-description]', err);
    return NextResponse.json({ error: 'Error al generar descripción' }, { status: 500 });
  }
}
