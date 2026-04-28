type AIParams = {
  userText: string;
  systemPrompt?: string;
  history?: { role: 'user' | 'assistant' | 'system'; content: string }[];
};

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
    } catch (e) {
      // writing creds failed — continue, the genai client may still attempt ADC
    }
  }
  // Try Gemini / Vertex AI via optional @google/genai package.
  // This will work either with an API key (`GEMINI_API_KEY`) or with
  // Google Application Default Credentials (set `GOOGLE_APPLICATION_CREDENTIALS`
  // pointing to the service account JSON) — so you can use the Vertex service account JSON locally.
  try {
    // dynamic import keeps the dependency optional
    const genai = await import('@google/genai');
    const GoogleGenAI = (genai as any).GoogleGenAI || (genai as any).default || genai;
    if (GoogleGenAI) {
      // If you have an API key set, pass it; otherwise the client will attempt
      // to use Application Default Credentials (ADC) from `GOOGLE_APPLICATION_CREDENTIALS`.
      const clientOptions: any = {};
      if (process.env.GEMINI_API_KEY) clientOptions.apiKey = process.env.GEMINI_API_KEY;
      const client = new GoogleGenAI(clientOptions);

      const model = process.env.GEMINI_MODEL ?? process.env.GOOGLE_GENAI_MODEL ?? 'models/text-bison-001';
      const content = `${system}\n\nUsuario: ${userText}`;

      // Try multiple possible method names depending on SDK version.
      let text: string | null = null;
      try {
        const resp: any = await client.models?.generateContent?.({ model, contents: content });
        text = resp?.candidates?.[0]?.content ?? resp?.output?.[0]?.content ?? resp?.text ?? null;
      } catch (_) {
        // ignore and try alternate signature
      }

      if (!text) {
        try {
          const resp2: any = await client.generate?.({ model, input: content });
          text = resp2?.data?.[0]?.text ?? resp2?.output ?? resp2?.text ?? null;
        } catch (_) {
          // ignore
        }
      }

      if (typeof text === 'string' && text.length > 0) return text;
    }
  } catch (e) {
    // Not fatal — fall back to OpenAI if available
    // console.warn is kept minimal to avoid spamming logs in production
    // (developer can enable more verbose logging when testing locally)
    // console.warn('Google GenAI client not available or failed:', e?.message ?? e);
  }

  // Fallback: OpenAI Chat Completions
  if (process.env.OPENAI_API_KEY) {
    const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    const payload = {
      model,
      messages: [
        { role: 'system', content: system },
        // optionally include history here
        { role: 'user', content: userText },
      ],
      max_tokens: 512,
    } as any;

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
