/**
 * Universal AI Adapter — single entry point for all LLM providers.
 *
 * The /api/chat route delegates to `runAdapter(...)` here. This keeps
 * the route file tiny and makes it easy to add new providers (or to
 * retry, fall back, or stream) without touching routing code.
 *
 * Pre-flight: every adapter call checks for the required env-var key
 * up front and returns a 400 with a clear, copy-pasteable message if
 * missing. This avoids forwarding the request to a provider that will
 * 401 on us.
 */

import { PROVIDERS, type ProviderId } from './providers';
import { OMNI_SYSTEM_PROMPT } from './system-prompt';

export interface AdapterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AdapterRequest {
  provider: ProviderId;
  model: string;
  messages: AdapterMessage[];
  credentials?: {
    anthropic?: string;
    groq?: string;
    cerebras?: string;
    gemini?: string;
    customBaseUrl?: string;
    customKey?: string;
    customModel?: string;
  };
}

export type AdapterErrorCode =
  | 'missing_credentials'
  | 'invalid_credentials'
  | 'rate_limited'
  | 'upstream_error'
  | 'unsupported_provider'
  | 'network';

export interface AdapterError {
  code: AdapterErrorCode;
  message: string;
  status: number;
  retryable: boolean;
}

export interface AdapterResult {
  content: string;
  provider: ProviderId;
  model: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
}

/** Configuration for the universal adapter. */
export const MAX_HISTORY_MESSAGES = 10;

/* ---------------- Pre-flight: env-key check ---------------- */

export interface ProviderClientConfig {
  provider: ProviderId;
  apiKey: string | null;
  baseUrl: string;
}

export function pickCredential(provider: ProviderId, creds?: AdapterRequest['credentials']): string | null {
  switch (provider) {
    case 'anthropic':
      if (creds?.anthropic?.trim()) return creds.anthropic.trim();
      return process.env.ANTHROPIC_API_KEY || null;
    case 'groq':
      if (creds?.groq?.trim()) return creds.groq.trim();
      return process.env.GROQ_API_KEY || null;
    case 'cerebras':
      if (creds?.cerebras?.trim()) return creds.cerebras.trim();
      return process.env.CEREBRAS_API_KEY || null;
    case 'ollama':
      // Ollama is local; auth optional. Custom URL is set in `customBaseUrl`.
      if (creds?.customKey?.trim()) return creds.customKey.trim();
      return null;
    case 'gemini':
      if (creds?.gemini?.trim()) return creds.gemini.trim();
      return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || null;
    default:
      return null;
  }
}

/**
 * Dynamic function that retrieves provider client details and API key
 * from .env.local (process.env) or user credentials.
 */
export function getProviderClient(
  provider: ProviderId,
  creds?: AdapterRequest['credentials'],
): ProviderClientConfig {
  const apiKey = pickCredential(provider, creds);
  let baseUrl = PROVIDERS[provider]?.baseUrl ?? '';
  if (provider === 'ollama' && creds?.customBaseUrl?.trim()) {
    baseUrl = creds.customBaseUrl.trim();
  }
  return {
    provider,
    apiKey,
    baseUrl,
  };
}

/** True when the provider has a usable server-side env key. Used for the
 * pre-flight check that produces a 400 instead of a 401. */
export function hasProviderKey(provider: ProviderId, creds?: AdapterRequest['credentials']): boolean {
  return pickCredential(provider, creds) !== null;
}

/* ---------------- Compose messages with truncation ---------------- */

/** Truncate history to the last N messages, always preserving the system
 * prompt at the top. Prevents runaway context windows. */
export function composeMessages(
  rawMessages: AdapterMessage[],
  greetingFastPath = false,
): AdapterMessage[] {
  const systemContent = greetingFastPath
    ? `${OMNI_SYSTEM_PROMPT}\n\n---\nCASUAL_GREETING_FAST_PATH :: The user sent a short greeting. Reply with a single crisp sentence (≤ 20 words). No tool calls, no markdown, no preamble.`
    : OMNI_SYSTEM_PROMPT;

  const system: AdapterMessage = { role: 'system', content: systemContent };

  // Keep only the last N conversation messages (drops older turns).
  const conversation = rawMessages.filter((m) => m.role !== 'system');
  const trimmed = conversation.slice(-MAX_HISTORY_MESSAGES);

  return [system, ...trimmed];
}

/** Detect short casual greetings. */
export function isCasualGreeting(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length === 0 || t.length > 16) return false;
  return /^(hi|hey|hello|yo|sup|gm|gn|hola|howdy|heya|hiya|whats? ?up|sup\??)$/i.test(t);
}

/* ---------------- Per-provider callers ---------------- */

interface UpstreamError extends Error {
  status: number;
  payload: AdapterError;
}

function wrapUpstream(status: number, payload: AdapterError): UpstreamError {
  const err = new Error(payload.message) as UpstreamError;
  err.status = status;
  err.payload = payload;
  return err;
}

function parseUpstreamError(
  status: number,
  rawText: string,
  family: 'anthropic' | 'openai-compatible' | 'gemini',
): AdapterError {
  let detail = rawText;
  try {
    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    const e = (parsed.error as { message?: string } | undefined)?.message;
    if (e) detail = e;
  } catch {
    /* rawText not JSON */
  }
  if (status === 401 || status === 403) {
    return {
      code: 'invalid_credentials',
      status,
      message: detail || 'Authentication failed.',
      retryable: false,
    };
  }
  if (status === 429) {
    return {
      code: 'rate_limited',
      status,
      message: detail || 'Rate limit reached.',
      retryable: true,
    };
  }
  if (status >= 500) {
    return {
      code: 'upstream_error',
      status,
      message: detail || `Provider returned ${status}.`,
      retryable: true,
    };
  }
  return {
    code: 'upstream_error',
    status,
    message: detail || `Request failed with status ${status}.`,
    retryable: false,
  };
}

async function callAnthropic(
  apiKey: string,
  model: string,
  composed: AdapterMessage[],
): Promise<AdapterResult> {
  const systemParts = composed.filter((m) => m.role === 'system').map((m) => m.content);
  const conversation = composed.filter((m) => m.role !== 'system');

  const res = await fetch(`${PROVIDERS.anthropic.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemParts.join('\n\n') || undefined,
      messages: conversation,
    }),
  });

  const text = await res.text();
  if (!res.ok) throw wrapUpstream(res.status, parseUpstreamError(res.status, text, 'anthropic'));

  const json = JSON.parse(text) as {
    content?: Array<{ type: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const content = json.content?.map((b) => (b.type === 'text' ? b.text : '')).join('') ?? '';
  return {
    content,
    provider: 'anthropic',
    model,
    usage: json.usage
      ? {
          input_tokens: json.usage.input_tokens,
          output_tokens: json.usage.output_tokens,
          total_tokens: (json.usage.input_tokens ?? 0) + (json.usage.output_tokens ?? 0),
        }
      : undefined,
  };
}

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string | null,
  model: string,
  composed: AdapterMessage[],
): Promise<AdapterResult> {
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (apiKey) headers['authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: composed.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 1024,
      temperature: 0.7,
      stream: false,
    }),
  });

  const text = await res.text();
  if (!res.ok) throw wrapUpstream(res.status, parseUpstreamError(res.status, text, 'openai-compatible'));

  const json = JSON.parse(text) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };
  const content = json.choices?.[0]?.message?.content ?? '';
  return {
    content,
    provider: 'groq', // resolved by caller
    model,
    usage: json.usage
      ? {
          input_tokens: json.usage.prompt_tokens,
          output_tokens: json.usage.completion_tokens,
          total_tokens: json.usage.total_tokens,
        }
      : undefined,
  };
}

async function callGemini(
  apiKey: string,
  model: string,
  composed: AdapterMessage[],
  providerId: ProviderId,
): Promise<AdapterResult> {
  const systemParts = composed.filter((m) => m.role === 'system').map((m) => m.content);
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  for (const m of composed) {
    if (m.role === 'system') continue;
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    });
  }
  const url = `${PROVIDERS.gemini.baseUrl}/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: systemParts.length
        ? { parts: [{ text: systemParts.join('\n\n') }] }
        : undefined,
      contents,
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
    }),
  });

  const text = await res.text();
  if (!res.ok) throw wrapUpstream(res.status, parseUpstreamError(res.status, text, 'gemini'));

  const json = JSON.parse(text) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
  };
  const content = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  const usage = json.usageMetadata;
  return {
    content,
    provider: providerId,
    model,
    usage: usage
      ? {
          input_tokens: usage.promptTokenCount,
          output_tokens: usage.candidatesTokenCount,
          total_tokens: usage.totalTokenCount,
        }
      : undefined,
  };
}

/* ---------------- Public entry point ---------------- */

export type AdapterOutcome =
  | { ok: true; data: AdapterResult }
  | { ok: false; error: AdapterError };

/**
 * Run a single completion through the right provider.
 * Returns a normalized envelope. The route handler translates this into
 * a NextResponse.
 */
export async function runAdapter(req: AdapterRequest): Promise<AdapterOutcome> {
  const { provider, credentials } = req;

  if (!PROVIDERS[provider]) {
    return {
      ok: false,
      error: {
        code: 'unsupported_provider',
        message: `Unknown provider: ${String(provider)}.`,
        status: 400,
        retryable: false,
      },
    };
  }

  // Pre-flight: key must exist (server env OR user-supplied).
  const clientConfig = getProviderClient(provider, credentials);
  const apiKey = clientConfig.apiKey;
  if (provider !== 'ollama' && !apiKey) {
    return {
      ok: false,
      error: {
        code: 'missing_credentials',
        message: `Provider [${PROVIDERS[provider].label}] key is not configured in .env.local. Add ${provider.toUpperCase()}_API_KEY or supply one in Settings.`,
        status: 400,
        retryable: false,
      },
    };
  }

  // For Ollama: require base URL.
  if (provider === 'ollama') {
    if (!clientConfig.baseUrl) {
      return {
        ok: false,
        error: {
          code: 'missing_credentials',
          message: 'Ollama provider requires a base URL. Open Settings and set it (e.g. http://localhost:11434/v1).',
          status: 400,
          retryable: false,
        },
      };
    }
  }

  // Detect greeting fast-path.
  const userText = req.messages.filter((m) => m.role === 'user').pop()?.content ?? '';
  const greeting = isCasualGreeting(userText);

  // Compose with history truncation + greeting augment.
  const composed = composeMessages(req.messages, greeting);

  const baseUrl = clientConfig.baseUrl;

  try {
    let result: AdapterResult;
    if (provider === 'anthropic') {
      result = await callAnthropic(apiKey as string, req.model, composed);
    } else if (provider === 'gemini') {
      result = await callGemini(apiKey as string, req.model, composed, provider);
    } else {
      // groq | cerebras | ollama
      const effectiveModel =
        provider === 'ollama' && credentials?.customModel?.trim()
          ? credentials.customModel.trim()
          : req.model;
      result = await callOpenAICompatible(baseUrl, apiKey, effectiveModel, composed);
      result.provider = provider;
      result.model = effectiveModel;
    }
    return { ok: true, data: result };
  } catch (err) {
    const e = err as Partial<UpstreamError>;
    if (e && e.payload && typeof e.status === 'number') {
      return { ok: false, error: e.payload };
    }
    return {
      ok: false,
      error: {
        code: 'network',
        message: err instanceof Error ? err.message : 'Unknown error contacting provider.',
        status: 502,
        retryable: true,
      },
    };
  }
}