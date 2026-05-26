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

  const prompt = `Eres un experto en ventas de repuestos y accesorios para motos en Colombia.
Analiza la imagen de un combo de productos para una tienda de motos llamada "Motoservicio A&R".

Basándote en lo que ves en la imagen, genera:
1. Un nombre comercial atractivo para el combo (máximo 6 palabras, ej: "Combo Frenos y Llantas Premium")
2. Una descripción de venta corta (máximo 2 oraciones, 40-60 palabras) resaltando los beneficios del combo y mencionando el regalo sorpresa que viene incluido

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
