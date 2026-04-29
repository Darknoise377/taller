type AIParams = {
  userText: string;
  systemPrompt?: string;
  history?: { role: 'user' | 'assistant' | 'system'; content: string }[];
};

// Minimal local types to avoid using `any` with dynamic SDK imports
type GenAIModelGenerateContent = (opts: { model: string; contents: string }) => Promise<unknown>;
type GenAIClientLike = {
  models?: {
    generateContent?: GenAIModelGenerateContent;
  };
  generate?: (opts: { model: string; input: string }) => Promise<unknown>;
};
type GenAiConstructor = new (opts?: Record<string, unknown>) => GenAIClientLike;

function extractTextFromObj(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  const candidates = o['candidates'];
  if (Array.isArray(candidates) && candidates.length > 0 && typeof candidates[0] === 'object') {
    const c0 = candidates[0] as Record<string, unknown>;
    if (typeof c0['content'] === 'string') return c0['content'] as string;
  }
  const output = o['output'];
  if (Array.isArray(output) && output.length > 0 && typeof output[0] === 'object') {
    const o0 = output[0] as Record<string, unknown>;
    if (typeof o0['content'] === 'string') return o0['content'] as string;
  }
  const predictions = o['predictions'];
  if (Array.isArray(predictions) && predictions.length > 0 && typeof predictions[0] === 'object') {
    const p0 = predictions[0] as Record<string, unknown>;
    if (typeof p0['content'] === 'string') return p0['content'] as string;
  }
  const dataProp = o['data'];
  if (Array.isArray(dataProp) && dataProp.length > 0 && typeof dataProp[0] === 'object') {
    const d0 = dataProp[0] as Record<string, unknown>;
    if (typeof d0['text'] === 'string') return d0['text'] as string;
  }
  if (typeof o['text'] === 'string') return o['text'] as string;
  return null;
}

/**
 * Lightweight AI wrapper: prefers Gemini via @google/genai if available, otherwise falls back to OpenAI.
 * - Set `GEMINI_API_KEY` and `GEMINI_MODEL` to use Google GenAI (optional install of @google/genai required).
 * - Or set `OPENAI_API_KEY` and `OPENAI_MODEL` to use OpenAI's chat completions.
 */
export default async function sendToAI({ userText, systemPrompt, history = [] }: AIParams): Promise<string> {
  const system = systemPrompt ?? 'Eres un asistente de ventas para una tienda online. Responde en español y sé amable.';
  // If the VERTEX service account JSON is provided via env (base64 or raw),
  // write it to a temp file and set GOOGLE_APPLICATION_CREDENTIALS so the
  // @google/genai client can pick it up (Node runtime required).
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && (process.env.VERTEX_SA_JSON || process.env.VERTEX_SA_JSON_BASE64)) {
    try {
      const os = await import('os');
      const path = await import('path');
      const fs = await import('fs');
      const tmp = os.tmpdir();
      const raw = process.env.VERTEX_SA_JSON ?? (process.env.VERTEX_SA_JSON_BASE64 ? Buffer.from(process.env.VERTEX_SA_JSON_BASE64, 'base64').toString('utf-8') : null);
      if (raw) {
        const filename = path.join(tmp, `vertex-sa-${process.pid}-${Date.now()}.json`);
        await fs.promises.writeFile(filename, raw, { encoding: 'utf-8', mode: 0o600 });
        process.env.GOOGLE_APPLICATION_CREDENTIALS = filename;
      }
    } catch {
      // writing creds failed — continue, the genai client may still attempt ADC
    }
  }

  // Try manual Vertex flow (service account JWT -> REST) if configured.
  try {
    // determine project id from env or service-account JSON
    const maybeProjectId = process.env.VERTEX_PROJECT_ID ?? (() => {
      try {
        const raw = process.env.VERTEX_SA_JSON ?? (process.env.VERTEX_SA_JSON_BASE64 ? Buffer.from(process.env.VERTEX_SA_JSON_BASE64, 'base64').toString('utf-8') : null);
        return raw ? JSON.parse(raw).project_id : undefined;
      } catch {
        return undefined;
      }
    })();

    const location = process.env.VERTEX_LOCATION ?? 'us-central1';
    const model = process.env.GENAI_MODEL ?? process.env.GEMINI_MODEL ?? process.env.GOOGLE_GENAI_MODEL ?? 'text-bison-001';

    if (maybeProjectId) {
      const v = await import('./vertex');
      const accessToken = await v.getVertexAccessToken();
      const endpoint = v.getVertexModelEndpoint(model, maybeProjectId, location);
      const historyContext = Array.isArray(history) && history.length ? history.map(h => `${h.role}: ${h.content}`).join('\n\n') + '\n\n' : '';
      const content = `${system}\n\n${historyContext}Usuario: ${userText}`;

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{ content }],
          parameters: { temperature: Number(process.env.VERTEX_TEMPERATURE ?? '0.2'), maxOutputTokens: Number(process.env.VERTEX_MAX_OUTPUT_TOKENS ?? '512') },
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const text = extractTextFromObj(data);
        if (text) return String(text).trim();
      }
    }
  } catch {
    // ignore and continue with other providers
  }
  // Try Gemini / Vertex AI via optional @google/genai package (SDK). This will only run
  // if the package is available in node_modules. We treat imported module as unknown and
  // narrow to a callable constructor shape to avoid `any` usage.
  try {
    const genaiModule = await import('@google/genai');
    let GoogleGenAIConstructor: GenAiConstructor | undefined;
    if (typeof genaiModule === 'function') {
      GoogleGenAIConstructor = genaiModule as unknown as GenAiConstructor;
    } else if (genaiModule && typeof (genaiModule as Record<string, unknown>)['GoogleGenAI'] === 'function') {
      GoogleGenAIConstructor = (genaiModule as Record<string, unknown>)['GoogleGenAI'] as unknown as GenAiConstructor;
    } else if (genaiModule && typeof (genaiModule as Record<string, unknown>)['default'] === 'function') {
      GoogleGenAIConstructor = (genaiModule as Record<string, unknown>)['default'] as unknown as GenAiConstructor;
    }

    if (GoogleGenAIConstructor) {
      const clientOptions: Record<string, unknown> = {};
      if (process.env.GEMINI_API_KEY) clientOptions.apiKey = process.env.GEMINI_API_KEY;
      const client = new GoogleGenAIConstructor(clientOptions);
      const genClient = client as GenAIClientLike;

      const model = process.env.GEMINI_MODEL ?? process.env.GOOGLE_GENAI_MODEL ?? 'models/text-bison-001';
      const historyContext = Array.isArray(history) && history.length ? history.map(h => `${h.role}: ${h.content}`).join('\n\n') + '\n\n' : '';
      const content = `${system}\n\n${historyContext}Usuario: ${userText}`;

      // Try multiple possible method names depending on SDK version.
      let text: string | null = null;
      try {
        const resp = await genClient.models?.generateContent?.({ model, contents: content });
        text = extractTextFromObj(resp);
      } catch {
        // ignore and try alternate signature
      }

      if (!text) {
        try {
          const resp2 = await genClient.generate?.({ model, input: content });
          text = extractTextFromObj(resp2);
        } catch {
          // ignore
        }
      }

      if (text) return text;
    }
  } catch {
    // Not fatal — fall back to OpenAI if available
  }

  // Fallback: OpenAI Chat Completions
  if (process.env.OPENAI_API_KEY) {
    const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: system },
      ...((Array.isArray(history) && history.length) ? history.map(h => ({ role: h.role, content: h.content })) : []),
      { role: 'user', content: userText },
    ];

    const payload: Record<string, unknown> = {
      model,
      messages,
      max_tokens: 512,
    };

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`OpenAI error: ${res.status} ${txt}`);
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? '';
    return String(reply).trim();
  }

  throw new Error('No AI provider configured. Set OPENAI_API_KEY or GEMINI_API_KEY.');
}
