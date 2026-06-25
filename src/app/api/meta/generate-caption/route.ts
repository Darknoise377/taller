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

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { name, description, price } = await req.json();

  if (!name) {
    return NextResponse.json({ error: 'Nombre del producto requerido' }, { status: 400 });
  }

  const prompt = `Eres un experto en redes sociales para una tienda de repuestos de motos en Colombia.
Genera una descripción corta (máximo 200 caracteres) para publicar en Facebook/Instagram.

Incluye:
- Tono comercial y atractivo
- 1-2 emojis relevantes (motocicleta, herramienta, flecha)
- Hashtags: #Repuestos #Motos #Taller (máximo 3)
- NO menciones precios explícitos

Producto: ${name}
${description ? `Detalles: ${description.substring(0, 100)}` : ''}

Responde SOLO el texto de la publicación.`;

  try {
    const { text } = await generateText({
      model: getAIModel(),
      prompt,
    });

    return NextResponse.json({ caption: text.trim() });
  } catch (err) {
    console.error('[meta/generate-caption] AI error:', err);
    return NextResponse.json({ error: 'Error al generar descripción' }, { status: 500 });
  }
}