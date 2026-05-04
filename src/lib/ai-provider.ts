import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';

/**
 * Returns a Vercel AI SDK LanguageModel based on available environment variables.
 * Priority: OpenAI → Google Gemini
 */
export function getAIModel(): LanguageModel {
  if (process.env.OPENAI_API_KEY) {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai(process.env.OPENAI_MODEL ?? 'gpt-4o-mini');
  }

  if (process.env.GEMINI_API_KEY) {
    const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
    return google(process.env.GEMINI_MODEL ?? 'gemini-2.0-flash');
  }

  throw new Error(
    'No AI provider configured. Set OPENAI_API_KEY or GEMINI_API_KEY in your environment variables.'
  );
}
