import { config } from '../../core/config.ts';

// Thin, reusable OpenAI-compatible chat-completions client for NVIDIA NIM.
// Not Kundli-specific — any future feature that needs an LLM call can reuse
// this directly instead of writing its own fetch.
export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

export class NimRequestError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

async function callOnce(model: string, messages: ChatMessage[]): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.nvidia.timeoutMs);
  try {
    const res = await fetch(`${config.nvidia.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.nvidia.apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        temperature: config.nvidia.temperature,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new NimRequestError(`NVIDIA NIM request failed (${res.status}): ${await res.text()}`, res.status);
    }
    const body = await res.json() as { choices?: { message?: { content?: string } }[] };
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new NimRequestError('NVIDIA NIM response had no content');
    return content;
  } finally {
    clearTimeout(timer);
  }
}

// Retries the primary model up to `maxRetries` times (transient errors —
// timeouts, 429s, 5xxs), then falls back to the fallback model once. Throws
// only if every attempt across both models fails — callers decide what
// "give up" means for them (kundliDescriptionRewriter.ts falls back to the
// original un-rewritten text rather than surfacing this to a user).
export async function chatCompleteWithFallback(messages: ChatMessage[]): Promise<{ content: string; model: string }> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= config.nvidia.maxRetries; attempt++) {
    try {
      return { content: await callOnce(config.nvidia.primaryModel, messages), model: config.nvidia.primaryModel };
    } catch (e) {
      lastError = e;
    }
  }
  try {
    return { content: await callOnce(config.nvidia.fallbackModel, messages), model: config.nvidia.fallbackModel };
  } catch (e) {
    lastError = e;
  }
  throw lastError instanceof Error ? lastError : new NimRequestError('NVIDIA NIM request failed');
}
