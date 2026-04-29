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
      const genaiModule: unknown = await import('@google/genai');
      const GoogleGenAICtor = (genaiModule as { GoogleGenAI?: unknown; default?: unknown })?.GoogleGenAI ?? (genaiModule as { default?: unknown })?.default ?? genaiModule;
      let client: unknown;
      if (typeof GoogleGenAICtor === 'function') {
        client = new (GoogleGenAICtor as new (opts?: unknown) => unknown)(process.env.GEMINI_API_KEY ? { apiKey: process.env.GEMINI_API_KEY } : {});
      } else {
        client = GoogleGenAICtor;
      }
      const model = process.env.GENAI_EMBEDDING_MODEL ?? 'textembedding-gecko-001';
      // Try a few possible method names
      try {
        const embeddingsCreate = (client as unknown as { embeddings?: { create?: (args: unknown) => Promise<unknown> } })?.embeddings?.create;
        if (embeddingsCreate) {
          const respUnknown = await embeddingsCreate({ model, input: text } as unknown);
          const respObj = respUnknown as { data?: Array<{ embedding?: number[] }>; embedding?: number[] } | undefined;
          const vector = respObj?.data?.[0]?.embedding ?? respObj?.embedding ?? null;
          if (vector) return vector as number[];
        }
      } catch {
        // ignore and try other signatures
      }
    } catch {
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

export async function createAndStoreEmbedding(opts: { text: string; model?: string; sourceType?: string; sourceId?: number | string | null }) {
  const vector = await createEmbeddingVector(opts.text);
  if (!vector) return null;
  const modelName = opts.model ?? (process.env.OPENAI_EMBEDDING_MODEL ?? process.env.GENAI_EMBEDDING_MODEL ?? 'unknown');
  const sourceType = opts.sourceType ?? null;
  const sourceId = opts.sourceId ?? null;
  const text = opts.text;

  // Try inserting using pgvector (requires pgvector extension and schema column vector(768)).
  // We cast a text parameter to vector: e.g. $1::vector
  const vectorLiteral = `[${vector.join(',')}]`;
  try {
    const inserted = await prisma.$queryRaw`
      INSERT INTO "Embedding" ("model","vector","sourceType","sourceId","text","createdAt")
      VALUES (${modelName}, ${vectorLiteral}::vector, ${sourceType}, ${sourceId}, ${text}, NOW())
      RETURNING *;
    `;
    if (Array.isArray(inserted)) return inserted[0];
    return inserted;
  } catch (pgError) {
    // Fallback: try inserting the vector as JSON (useful when DB still has JSON column)
    try {
      const insertedJson = await prisma.$queryRaw`
        INSERT INTO "Embedding" ("model","vector","sourceType","sourceId","text","createdAt")
        VALUES (${modelName}, ${JSON.stringify(vector)}::jsonb, ${sourceType}, ${sourceId}, ${text}, NOW())
        RETURNING *;
      `;
      if (Array.isArray(insertedJson)) return insertedJson[0];
      return insertedJson;
    } catch {
      // If all raw inserts fail, rethrow the original error for visibility
      throw pgError;
    }
  }
}
