import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { name, description, price } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Nombre del producto requerido' }, { status: 400 });
    }

    const prompt = `Genera una descripción atractiva para publicar en redes sociales (máximo 200 caracteres) para este repuesto de motos:
    
    Nombre: ${name}
    ${description ? `Descripción: ${description}` : ''}
    ${price ? `Precio: $${price}` : ''}
    
    Usa un tono comercial, incluye emojis relevantes y hashtags como #Repuestos #Motos #Taller`.trim();

    // Llamada a IA (Gemini)
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY no configurado' }, { status: 500 });
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!res.ok) {
      throw new Error('Error en API de IA');
    }

    const data = await res.json();
    const caption = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    return NextResponse.json({ caption });
  } catch (error) {
    console.error('Generate caption error:', error);
    return NextResponse.json({ error: 'Error al generar descripción' }, { status: 500 });
  }
}