import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createVertex } from '@ai-sdk/google-vertex';
import type { LanguageModel } from 'ai';

/**
 * Parses and returns the Google service account credentials from env vars.
 * Supports VERTEX_SA_JSON_BASE64 (preferred) or VERTEX_SA_JSON (raw JSON string).
 */
function getVertexCredentials(): { client_email: string; private_key: string } | null {
  const raw =
    process.env.VERTEX_SA_JSON_BASE64
      ? Buffer.from(process.env.VERTEX_SA_JSON_BASE64, 'base64').toString('utf-8')
      : process.env.VERTEX_SA_JSON ?? null;

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      client_email?: string;
      private_key?: string;
    };
    if (!parsed.client_email || !parsed.private_key) {
      console.error('[ai-provider] SA JSON parsed but missing client_email or private_key');
      return null;
    }
    return { client_email: parsed.client_email, private_key: parsed.private_key };
  } catch (e) {
    console.error('[ai-provider] Failed to parse SA JSON:', e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * Returns a Vercel AI SDK LanguageModel based on available environment variables.
 * Priority: Vertex AI (service account) → Google Gemini API key → OpenAI
 */
export function getAIModel(): LanguageModel {
  // 1. Vertex AI via service account JSON (recommended for GCP)
  const vtxCreds = getVertexCredentials();
  if (vtxCreds) {
    const vertexProvider = createVertex({
      project: process.env.VERTEX_PROJECT_ID,
      location: process.env.VERTEX_LOCATION ?? 'us-central1',
      googleAuthOptions: {
        credentials: {
          client_email: vtxCreds.client_email,
          private_key: vtxCreds.private_key,
        },
      },
    });
    return vertexProvider(process.env.GEMINI_MODEL ?? 'gemini-2.0-flash');
  }

  // 2. Google Gemini via API key
  if (process.env.GEMINI_API_KEY) {
    const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
    return google(process.env.GEMINI_MODEL ?? 'gemini-2.0-flash');
  }

  // 3. OpenAI fallback
  if (process.env.OPENAI_API_KEY) {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai(process.env.OPENAI_MODEL ?? 'gpt-4o-mini');
  }

  throw new Error(
    'No AI provider configured. Set VERTEX_SA_JSON_BASE64, GEMINI_API_KEY, or OPENAI_API_KEY.'
  );
}
