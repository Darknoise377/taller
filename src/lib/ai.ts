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

  // Try Gemini (@google/genai) via dynamic import if configured
  if (process.env.GEMINI_API_KEY) {
    try {
      // dynamic import keeps package optional
      // NOTE: if you want to use this, install: npm i @google/genai
      const genai = await import('@google/genai');
      const GoogleGenAI = (genai as any).GoogleGenAI || (genai as any).default;
      if (GoogleGenAI) {
        const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        // The exact SDK call may vary by version; this is a best-effort example.
        const model = process.env.GEMINI_MODEL ?? 'gemini-1.5-mini';
        // Build a simple prompt
        const content = `${system}\n\nUsuario: ${userText}`;
        const resp: any = await client.models.generateContent({ model, contents: content });
        // Extract text in a robust way
        const text = resp?.candidates?.[0]?.content ?? resp?.output?.[0]?.content ?? resp?.text ?? null;
        if (typeof text === 'string') return text;
      }
    } catch (e) {
      console.warn('Gemini client not available or failed, falling back to OpenAI:', e?.message ?? e);
    }
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
