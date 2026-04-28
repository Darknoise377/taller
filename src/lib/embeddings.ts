import { prisma } from '@/lib/prisma';

async function ensureVertexCredentialsIfProvided() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return;
  const raw = process.env.VERTEX_SA_JSON ?? (process.env.VERTEX_SA_JSON_BASE64 ? Buffer.from(process.env.VERTEX_SA_JSON_BASE64, 'base64').toString('utf-8') : null);
  if (!raw) return;
  const os = await import('os');
  const path = await import('path');
  const fs = await import('fs');
  const filename = path.join(os.tmpdir(), `vertex-sa-${process.pid}-${Date.now()}.json`);
  await fs.promises.writeFile(filename, raw, { encoding: 'utf-8', mode: 0o600 });
  process.env.GOOGLE_APPLICATION_CREDENTIALS = filename;
}

export async function createEmbeddingVector(text: string): Promise<number[] | null> {
  // Prefer Vertex if configured
  if (process.env.VERTEX_SA_JSON || process.env.GEMINI_API_KEY) {
    try {
      await ensureVertexCredentialsIfProvided();
      const genai = await import('@google/genai');
      const GoogleGenAI = (genai as any).GoogleGenAI || (genai as any).default || genai;
      const client = new GoogleGenAI(process.env.GEMINI_API_KEY ? { apiKey: process.env.GEMINI_API_KEY } : {});
      const model = process.env.GENAI_EMBEDDING_MODEL ?? 'textembedding-gecko-001';
      // Try a few possible method names
      try {
        const resp: any = await client.embeddings?.create?.({ model, input: text });
        const vector = resp?.data?.[0]?.embedding ?? resp?.embedding ?? null;
        if (vector) return vector as number[];
      } catch (e) {
        // ignore and try other signatures
      }
    } catch (e) {
      // fallthrough to OpenAI
    }
  }

  // Fallback: OpenAI embeddings
  if (process.env.OPENAI_API_KEY) {
    const model = process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small';
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: text, model }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`OpenAI embeddings error: ${res.status} ${txt}`);
    }
    const data = await res.json();
    return data?.data?.[0]?.embedding ?? null;
  }

  return null;
}

export async function createAndStoreEmbedding(opts: { text: string; model?: string; sourceType?: string; sourceId?: number | null }) {
  const vector = await createEmbeddingVector(opts.text);
  if (!vector) return null;
  const rec = await prisma.embedding.create({ data: { model: opts.model ?? (process.env.OPENAI_EMBEDDING_MODEL ?? process.env.GENAI_EMBEDDING_MODEL ?? 'unknown'), vector: vector as any, sourceType: opts.sourceType ?? null, sourceId: opts.sourceId ?? null, text: opts.text } });
  return rec;
}
