import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createVertex } from '@ai-sdk/google-vertex';
import type { LanguageModel, ImageModel } from 'ai';

/**
 * Parses and returns the Google service account credentials from env vars.
 * Supports VERTEX_SA_JSON_BASE64 (preferred) or VERTEX_SA_JSON (raw JSON string).
 */
function getVertexCredentials(): { client_email: string; private_key: string; project_id?: string } | null {
  const raw =
    process.env.VERTEX_SA_JSON_BASE64
      ? Buffer.from(process.env.VERTEX_SA_JSON_BASE64, 'base64').toString('utf-8')
      : process.env.VERTEX_SA_JSON ?? null;

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      client_email?: string;
      private_key?: string;
      project_id?: string;
    };
    if (!parsed.client_email || !parsed.private_key) {
      console.warn('[ai-provider] SA JSON parsed but missing client_email or private_key');
      return null;
    }
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key,
      project_id: parsed.project_id,
    };
  } catch (e) {
    console.warn('[ai-provider] Failed to parse SA JSON:', e instanceof Error ? e.message : e);
    return null;
  }
}

export function getAIStatus(): {
  configured: boolean;
  provider: 'vertex' | 'gemini' | 'openai' | 'none';
  model: string;
  details: string;
} {
  const vtxCreds = getVertexCredentials();
  const vertexProject = process.env.VERTEX_PROJECT_ID || vtxCreds?.project_id;
  if (vtxCreds && vertexProject) {
    return {
      configured: true,
      provider: 'vertex',
      model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
      details: `Vertex AI (${vertexProject})`,
    };
  }

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (geminiKey) {
    return {
      configured: true,
      provider: 'gemini',
      model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
      details: 'Google Gemini API',
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      configured: true,
      provider: 'openai',
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      details: 'OpenAI API',
    };
  }

  return {
    configured: false,
    provider: 'none',
    model: 'none',
    details: 'Sin proveedor configurado. Agrega GEMINI_API_KEY o VERTEX_SA_JSON_BASE64 en las variables de entorno.',
  };
}

/**
 * Returns a Vercel AI SDK LanguageModel based on available environment variables.
 * Priority: Vertex AI (service account) → Google Gemini API key → OpenAI
 */
export function getAIModel(): LanguageModel {
  // 1. Vertex AI via service account JSON (recommended for GCP)
  const vtxCreds = getVertexCredentials();
  const vertexProject = process.env.VERTEX_PROJECT_ID || vtxCreds?.project_id;
  if (vtxCreds && vertexProject) {
    const vertexProvider = createVertex({
      project: vertexProject,
      location: process.env.VERTEX_LOCATION ?? 'us-central1',
      googleAuthOptions: {
        credentials: {
          client_email: vtxCreds.client_email,
          private_key: vtxCreds.private_key,
        },
      },
    });
    return vertexProvider(process.env.GEMINI_MODEL ?? 'gemini-2.5-flash');
  }

  // 2. Google Gemini via API key
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (geminiKey) {
    const google = createGoogleGenerativeAI({ apiKey: geminiKey });
    return google(process.env.GEMINI_MODEL ?? 'gemini-2.5-flash');
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

/**
 * Returns a Vercel AI SDK ImageModel based on available environment variables.
 * Priority: Vertex AI (service account) → Google Gemini API key → OpenAI DALL-E 3
 */
export function getAIImageModel(): ImageModel {
  // 1. Vertex AI via service account (same credentials as getAIModel)
  const vtxCreds = getVertexCredentials();
  const vertexProject = process.env.VERTEX_PROJECT_ID || vtxCreds?.project_id;
  if (vtxCreds && vertexProject) {
    const vertexProvider = createVertex({
      project: vertexProject,
      location: process.env.VERTEX_LOCATION ?? 'us-central1',
      googleAuthOptions: {
        credentials: {
          client_email: vtxCreds.client_email,
          private_key: vtxCreds.private_key,
        },
      },
    });
    return vertexProvider.image(process.env.IMAGEN_MODEL ?? 'imagen-3.0-generate-002');
  }

  // 2. Google Gemini API key
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (geminiKey) {
    const google = createGoogleGenerativeAI({ apiKey: geminiKey });
    return google.image(process.env.IMAGEN_MODEL ?? 'imagen-3.0-generate-002');
  }

  // 3. OpenAI fallback
  if (process.env.OPENAI_API_KEY) {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai.image(process.env.IMAGE_MODEL ?? 'dall-e-3');
  }

  throw new Error(
    'No image AI provider configured. Set VERTEX_SA_JSON_BASE64, GEMINI_API_KEY, or OPENAI_API_KEY.'
  );
}
