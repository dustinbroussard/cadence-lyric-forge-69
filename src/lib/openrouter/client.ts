import { chatResponseSchema, ChatResponse, messageSchema } from './schemas';

export function extractJsonFromMarkdown(text: string): unknown {
  const match = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON block found');
  const raw = match[1] ?? match[0];
  return JSON.parse(raw);
}

export async function withBackoff<T>(fn: () => Promise<T>, max = 4): Promise<T> {
  let delay = 400;
  for (let i = 0; i <= max; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === max) throw e;
      await new Promise((r) => setTimeout(r, delay + Math.random() * delay));
      delay *= 1.6;
    }
  }
  throw new Error('unreachable');
}

interface ChatOptions {
  model: string;
  messages: Array<typeof messageSchema._type>;
  signal?: AbortSignal;
  apiKey?: string;
}

export async function chat({ model, messages, signal, apiKey }: ChatOptions): Promise<ChatResponse> {
  const key = apiKey ?? localStorage.getItem('openrouter_key');
  if (!key) throw new Error('Missing OpenRouter API key');

  return withBackoff(async () => {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'HTTP-Referer': location.origin,
        'X-Title': 'Cadence Lyric Forge'
      },
      body: JSON.stringify({ model, messages }),
      signal
    });
    if (!res.ok) {
      throw new Error(`OpenRouter error ${res.status}`);
    }
    const json = await res.json();
    return chatResponseSchema.parse(json);
  });
}
