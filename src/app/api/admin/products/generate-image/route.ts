import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateImage } from 'ai';
import { GoogleGenAI } from '@google/genai';
import { verifyAdminToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/config/admin';
import { getAIImageModel } from '@/lib/ai-provider';
import cloudinary from '@/lib/cloudinary';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try { await verifyAdminToken(token); return true; } catch { return null; }
}

export const maxDuration = 60;

/**
 * Builds a @google/genai client using the same credential priority as getAIModel.
 * Returns null when no Google provider is configured (i.e. OpenAI-only setup).
 */
function buildGenAI(): GoogleGenAI | null {
  // 1. Vertex AI via service account
  const raw = process.env.VERTEX_SA_JSON_BASE64
    ? Buffer.from(process.env.VERTEX_SA_JSON_BASE64, 'base64').toString('utf-8')
    : process.env.VERTEX_SA_JSON ?? null;

  if (raw) {
    try {
      const creds = JSON.parse(raw) as { client_email?: string; private_key?: string };
      if (creds.client_email && creds.private_key) {
        return new GoogleGenAI({
          vertexai: true,
          project: process.env.VERTEX_PROJECT_ID,
          location: process.env.VERTEX_LOCATION ?? 'us-central1',
          googleAuthOptions: {
            credentials: {
              client_email: creds.client_email,
              private_key: creds.private_key,
            },
          },
        });
      }
    } catch { /* fall through */ }
  }

  // 2. Google Gemini API key
  if (process.env.GEMINI_API_KEY) {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  return null;
}

/**
 * Uses Gemini's native image-understanding + image-generation to produce a
 * variation that is visually faithful to the reference product image.
 * Returns base64 string of the generated image, or null on failure.
 */
async function generateVariationFromReference(
  genAI: GoogleGenAI,
  refBase64: string,
  mimeType: string,
  extraPrompt: string,
): Promise<string | null> {
  const model = process.env.GEMINI_IMAGE_GEN_MODEL ?? 'gemini-2.0-flash-preview-image-generation';
  const instructionParts = [
    'Generate a professional e-commerce product photo of EXACTLY this product.',
    'Keep the product 100% identical: same shape, color, materials, textures, and details.',
    extraPrompt ? `Additional instructions: ${extraPrompt}` : '',
    'Use a clean white background with soft studio lighting, sharp focus, high resolution.',
    'Do NOT add any text, watermarks, logos, or people.',
  ].filter(Boolean).join(' ');

  const response = await genAI.models.generateContent({
    model,
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: refBase64 } },
        { text: instructionParts },
      ],
    }],
    config: { responseModalities: ['IMAGE', 'TEXT'] },
  });

  for (const candidate of (response.candidates ?? [])) {
    for (const part of (candidate.content?.parts ?? [])) {
      if (part.inlineData?.data) return part.inlineData.data;
    }
  }
  return null;
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await req.json() as { prompt?: string; mainImageUrl?: string };
  const { prompt = '', mainImageUrl } = body;

  let imageBase64: string | null = null;

  // ─── Path A: Reference image provided → image-to-image variation ──────────
  // Gemini can see the product and generate a faithful variation without losing
  // product identity (shape, color, material). This is the preferred path.
  if (mainImageUrl) {
    const genAI = buildGenAI();
    if (genAI) {
      try {
        const imgRes = await fetch(mainImageUrl);
        if (imgRes.ok) {
          const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg';
          const mimeType = contentType.split(';')[0].trim();
          const refBase64 = Buffer.from(await imgRes.arrayBuffer()).toString('base64');
          imageBase64 = await generateVariationFromReference(genAI, refBase64, mimeType, prompt.trim());
        }
      } catch (err) {
        console.error('[generate-image] image-to-image failed, falling back to text-to-image:', err);
      }
    }
  }

  // ─── Path B: Text-to-image (no reference, or variation path failed) ────────
  if (!imageBase64) {
    if (!prompt.trim()) {
      return NextResponse.json({ error: 'El prompt es requerido' }, { status: 400 });
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

    const fullPrompt = [
      'Professional product photography of a motorcycle spare part or accessory.',
      prompt.trim(),
      'Clean white background, studio lighting, sharp focus, high resolution, e-commerce style.',
      'No text, no watermarks, no people.',
    ].join(' ');

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
  }

  // ─── Upload to Cloudinary ──────────────────────────────────────────────────
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
