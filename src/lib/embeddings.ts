import { prisma } from '@/lib/prisma';

/**
 * Parses the Vertex service account JSON from env vars.
 * Supports VERTEX_SA_JSON_BASE64 (preferred) or VERTEX_SA_JSON (raw).
 */
function parseVertexSA(): { client_email: string; private_key: string; project_id?: string } | null {
  const raw =
    process.env.VERTEX_SA_JSON_BASE64
      ? Buffer.from(process.env.VERTEX_SA_JSON_BASE64, 'base64').toString('utf-8')
      : process.env.VERTEX_SA_JSON ?? null;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    if (!parsed.client_email || !parsed.private_key) return null;
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key,
      project_id: parsed.project_id,
    };
  } catch {
    return null;
  }
}

/**
 * Gets an OAuth2 access token from Google using the service account credentials.
 * Uses the JWT Bearer flow — no file system access needed (works in serverless).
 */
async function getVertexAccessToken(sa: { client_email: string; private_key: string }): Promise<string | null> {
  try {
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({
      credentials: {
        client_email: sa.client_email,
        private_key: sa.private_key,
      },
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    return tokenResponse?.token ?? null;
  } catch {
    return null;
  }
}

export async function createEmbeddingVector(text: string): Promise<number[] | null> {
  // Prefer Vertex SA credentials (base64 or raw JSON)
  const sa = parseVertexSA();
  if (sa) {
    try {
      const accessToken = await getVertexAccessToken(sa);
      if (accessToken) {
        const project = process.env.VERTEX_PROJECT_ID ?? sa.project_id ?? '';
        const location = process.env.VERTEX_LOCATION ?? 'us-central1';
        const model = process.env.GENAI_EMBEDDING_MODEL ?? 'text-embedding-004';
        const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:predict`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instances: [{ content: text }],
          }),
        });

        if (res.ok) {
          const data = await res.json() as {
            predictions?: Array<{ embeddings?: { values?: number[] } }>;
          };
          const vector = data.predictions?.[0]?.embeddings?.values;
          if (vector && vector.length > 0) return vector;
        }
      }
    } catch {
      // fallthrough to GEMINI_API_KEY or OpenAI
    }
  }

  // Fallback: Gemini API key (uses text-embedding-004 via REST)
  if (process.env.GEMINI_API_KEY) {
    try {
      const model = process.env.GENAI_EMBEDDING_MODEL ?? 'text-embedding-004';
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: { parts: [{ text }] } }),
        }
      );
      if (res.ok) {
        const data = await res.json() as { embedding?: { values?: number[] } };
        const vector = data.embedding?.values;
        if (vector && vector.length > 0) return vector;
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
    const data = await res.json() as { data?: Array<{ embedding?: number[] }> };
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
