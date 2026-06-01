import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateText, generateImage } from 'ai';
import { verifyAdminToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/config/admin';
import { getAIModel, getAIImageModel } from '@/lib/ai-provider';
import cloudinary from '@/lib/cloudinary';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try { await verifyAdminToken(token); return true; } catch { return null; }
}

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let imageModel;
  try {
    imageModel = getAIImageModel();
  } catch {
    return NextResponse.json(
      { error: 'No hay proveedor de IA de imágenes configurado. Configura GEMINI_API_KEY u OPENAI_API_KEY.' },
      { status: 503 }
    );
  }

  const body = await req.json() as { prompt?: string; mainImageUrl?: string };
  const { prompt, mainImageUrl } = body;

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'El prompt es requerido' }, { status: 400 });
  }

  let finalPrompt = prompt.trim();

  // ─── Step 1: Vision enrichment ────────────────────────────────────────────
  // If the admin already uploaded a reference image, use the existing AI model
  // (multimodal: Gemini 2.5 Flash / GPT-4o) to describe the product and enrich
  // the generation prompt.
  if (mainImageUrl) {
    try {
      const { text: imageDesc } = await generateText({
        model: getAIModel(),
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', image: new URL(mainImageUrl) },
              {
                type: 'text',
                text: 'Describe this motorcycle spare part product image in 2-3 sentences for use in an image generation prompt. Focus on the product type, shape, color, and material. Be visual and specific.',
              },
            ],
          },
        ],
      });
      if (imageDesc?.trim()) {
        finalPrompt = `Product: ${imageDesc.trim()}\nVariation requested: ${prompt.trim()}`;
      }
    } catch {
      // Not a hard failure — continue with the user's prompt only
    }
  }

  // ─── Step 2: AI image generation ──────────────────────────────────────────
  // Uses Imagen 3 (Gemini) or DALL-E 3 (OpenAI) depending on what's configured.
  const fullPrompt = [
    'Professional product photography of a motorcycle spare part or accessory.',
    finalPrompt,
    'Clean white background, studio lighting, sharp focus, high resolution, e-commerce style.',
    'No text, no watermarks, no people.',
  ].join(' ');

  let imageBase64: string;
  try {
    const { image } = await generateImage({
      model: imageModel,
      prompt: fullPrompt,
      size: '1024x1024',
    });
    imageBase64 = image.base64;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al generar la imagen';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // ─── Step 3: Persist to Cloudinary ────────────────────────────────────────
  // The generated image is uploaded immediately to get a permanent URL.
  const imgBuffer = Buffer.from(imageBase64, 'base64');

  const cloudinaryUrl = await new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'products/ai-generated', resource_type: 'image' },
      (err, result) => {
        if (err ?? !result) reject(err ?? new Error('Cloudinary upload failed'));
        else resolve(result!.secure_url);
      }
    );
    stream.end(imgBuffer);
  });

  return NextResponse.json({ url: cloudinaryUrl });
}
