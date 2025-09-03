import { chatResponseSchema, ChatResponse, messageSchema } from './schemas';

export function extractJsonFromMarkdown(text: string): unknown {
  // Prefer fenced code blocks labelled as JSON but fall back to any fenced block
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);

  let jsonString: string | null = null;

  if (fenceMatch) {
    jsonString = fenceMatch[1];
  } else {
    // No fence found – attempt to locate the first JSON object by tracking braces
    const start = text.indexOf('{');
    if (start !== -1) {
      let depth = 0;
      for (let i = start; i < text.length; i++) {
        const char = text[i];
        if (char === '{' || char === '[') depth++;
        if (char === '}' || char === ']') {
          depth--;
          if (depth === 0) {
            jsonString = text.slice(start, i + 1);
            break;
          }
        }
      }
    }
  }

  if (!jsonString) throw new Error('No JSON block found');
  return JSON.parse(jsonString);
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
    const requestInit: RequestInit = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'HTTP-Referer': location.origin,
        'X-Title': 'Cadence Lyric Forge'
      },
      body: JSON.stringify({ model, messages })
    };
    
    if (signal) {
      requestInit.signal = signal;
    }
    
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', requestInit);
    if (!res.ok) {
      throw new Error(`OpenRouter error ${res.status}`);
    }
    const json = await res.json();
    return chatResponseSchema.parse(json);
  });
}
