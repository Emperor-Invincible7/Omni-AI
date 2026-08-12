/**
 * /api/chat — server-side provider router with DB-backed conversation history.
 *
 * Responsibilities:
 *  1. Validate the request shape.
 *  2. Resolve credentials (user-supplied → env fallback).
 *  3. If `sessionId` is provided, load prior turns from SQLite and prepend
 *     them to the messages array — plus the OMNI-AI system prompt at the top.
 *  4. Route to the right provider (anthropic / openai-compatible).
 *  5. Return a normalized { ok, data | error } envelope.
 *
 * Persistence is the client's job (`saveTurnAction`). This route is the
 * stateless inference boundary.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PROVIDERS, type ProviderId } from '@/lib/providers';
import {
  ChatErrorCode,
  ChatErrorPayload,
  ChatMessage,
  ChatRequest,
  ChatResponse,
} from '@/lib/api-router';
import { getMessages } from '@/lib/sessions';
import { OMNI_SYSTEM_PROMPT } from '@/lib/system-prompt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function fail(code: ChatErrorCode, message: string, status = 400, retryable = false) {
  const error: ChatErrorPayload = { code, message, status, retryable };
  const body: ChatResponse = { ok: false, error };
  return NextResponse.json(body, { status });
}

function isProviderId(value: unknown): value is ProviderId {
  return typeof value === 'string' && value in PROVIDERS;
}

type CredentialsPayload = NonNullable<ChatRequest['credentials']>;

function pickCredential(provider: ProviderId, fromBody: CredentialsPayload | undefined): string | null {
  switch (provider) {
    case 'anthropic':
      if (fromBody?.anthropic && fromBody.anthropic.trim()) return fromBody.anthropic.trim();
      return process.env.ANTHROPIC_API_KEY || null;
    case 'groq':
      if (fromBody?.groq && fromBody.groq.trim()) return fromBody.groq.trim();
      return process.env.GROQ_API_KEY || null;
    case 'cerebras':
      if (fromBody?.cerebras && fromBody.cerebras.trim()) return fromBody.cerebras.trim();
      return process.env.CEREBRAS_API_KEY || null;
    case 'custom':
      return fromBody?.customKey && fromBody.customKey.trim() ? fromBody.customKey.trim() : null;
  }
}

function customBaseUrl(fromBody: CredentialsPayload | undefined): string | null {
  const url = fromBody?.customBaseUrl?.trim();
  return url ? url : null;
}

interface UpstreamResult {
  content: string;
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
}

async function callAnthropic(apiKey: string, model: string, messages: ChatMessage[]): Promise<UpstreamResult> {
  const url = `${PROVIDERS.anthropic.baseUrl}/v1/messages`;
  const systemParts = messages.filter((m) => m.role === 'system').map((m) => m.content);
  const conversation = messages.filter((m) => m.role !== 'system');

  const res = await fetch(url, {
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
  if (!res.ok) {
    throw new UpstreamError(res.status, parseUpstreamError(res.status, text, 'anthropic'));
  }
  const json = JSON.parse(text) as {
    content?: Array<{ type: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const content =
    json.content?.map((block) => (block.type === 'text' ? block.text : '')).join('') ?? '';
  return {
    content,
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
  messages: ChatMessage[],
): Promise<UpstreamResult> {
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (apiKey) headers['authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 1024,
      temperature: 0.7,
      stream: false,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new UpstreamError(res.status, parseUpstreamError(res.status, text, 'openai-compatible'));
  }
  const json = JSON.parse(text) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };
  const content = json.choices?.[0]?.message?.content ?? '';
  return {
    content,
    usage: json.usage
      ? {
          input_tokens: json.usage.prompt_tokens,
          output_tokens: json.usage.completion_tokens,
          total_tokens: json.usage.total_tokens,
        }
      : undefined,
  };
}

class UpstreamError extends Error {
  status: number;
  payload: ChatErrorPayload;
  constructor(status: number, payload: ChatErrorPayload) {
    super(payload.message);
    this.status = status;
    this.payload = payload;
  }
}

function parseUpstreamError(
  status: number,
  rawText: string,
  family: 'anthropic' | 'openai-compatible',
): ChatErrorPayload {
  let detail = rawText;
  try {
    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    const err = (parsed.error as { message?: string } | undefined)?.message;
    if (err) detail = err;
  } catch {
    /* rawText was not JSON */
  }
  if (status === 401 || status === 403) {
    return { code: 'invalid_credentials', status, message: detail || 'Authentication failed.', retryable: false };
  }
  if (status === 429) {
    return { code: 'rate_limited', status, message: detail || 'Rate limit reached.', retryable: true };
  }
  if (status >= 500) {
    return { code: 'upstream_error', status, message: detail || `Provider returned ${status}.`, retryable: true };
  }
  return { code: 'upstream_error', status, message: detail || `Request failed with status ${status}.`, retryable: false };
}

export async function POST(req: NextRequest) {
  let raw: ChatRequest & { sessionId?: string };
  try {
    raw = (await req.json()) as ChatRequest & { sessionId?: string };
  } catch {
    return fail('upstream_error', 'Request body must be JSON.', 400);
  }

  const { provider, model, messages, credentials, sessionId } = raw;

  if (!isProviderId(provider)) return fail('unsupported_provider', `Unknown provider: ${String(provider)}.`);
  if (!model || typeof model !== 'string') return fail('upstream_error', 'Missing model id.', 400);
  if (!Array.isArray(messages) || messages.length === 0) {
    return fail('upstream_error', 'Messages array is required.', 400);
  }

  const cfg = PROVIDERS[provider];

  // Resolve credential + base URL
  const apiKey = pickCredential(provider, credentials);
  let baseUrl = cfg.baseUrl;
  if (provider === 'custom') {
    const userUrl = customBaseUrl(credentials);
    if (!userUrl) {
      return fail('missing_credentials', 'Custom provider needs a base URL. Open Settings and add one (e.g. http://localhost:11434/v1).');
    }
    baseUrl = userUrl;
  } else if (cfg.requiresUserKey && !apiKey) {
    return fail('missing_credentials', `${cfg.label} requires an API key. Add one in Settings.`);
  }

  // Compose full message history: system prompt + DB history + current turn
  const composed: ChatMessage[] = [{ role: 'system', content: OMNI_SYSTEM_PROMPT }];

  if (sessionId) {
    try {
      const history = await getMessages(sessionId);
      for (const m of history) {
        composed.push({ role: m.role, content: m.content });
      }
    } catch {
      // DB unavailable — proceed with no history rather than 500.
    }
  }

  for (const m of messages) composed.push(m);

  try {
    let result: UpstreamResult;
    if (cfg.openAICompatible) {
      const effectiveModel =
        provider === 'custom' && credentials?.customModel && credentials.customModel.trim()
          ? credentials.customModel.trim()
          : model;
      result = await callOpenAICompatible(baseUrl, apiKey, effectiveModel, composed);
    } else {
      if (!apiKey) {
        return fail('missing_credentials', 'No Anthropic credential available. Set ANTHROPIC_API_KEY or add one in Settings.');
      }
      result = await callAnthropic(apiKey, model, composed);
    }

    return NextResponse.json({
      ok: true,
      data: { ...result, provider, model },
    } satisfies ChatResponse);
  } catch (err) {
    if (err instanceof UpstreamError) {
      return NextResponse.json({ ok: false, error: err.payload } satisfies ChatResponse, { status: err.status });
    }
    return fail('network', err instanceof Error ? err.message : 'Unknown error contacting provider.', 502, true);
  }
}