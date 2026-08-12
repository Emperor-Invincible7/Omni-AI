/**
 * Frontend API router.
 *
 * Chat composer calls `sendChat(messages)` which POSTs to /api/chat.
 * The route handler (src/app/api/chat/route.ts) is responsible for picking
 * the right provider, building the correct auth headers, and returning a
 * normalized response shape.
 *
 * On non-2xx responses the route returns `{ ok: false, error: { ... } }`
 * with a stable `code` so the frontend can present actionable fallback UI.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  provider: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  /** Optional session id — server loads prior turns from DB. */
  sessionId?: string;
  /**
   * Optional credential payload forwarded from the browser. The server
   * uses these only when the matching provider is active; otherwise it
   * falls back to process.env. Keys are never persisted server-side.
   */
  credentials?: {
    anthropic?: string;
    groq?: string;
    cerebras?: string;
    customBaseUrl?: string;
    customKey?: string;
    customModel?: string;
  };
}

export type ChatErrorCode =
  | 'missing_credentials'
  | 'invalid_credentials'
  | 'rate_limited'
  | 'upstream_error'
  | 'unsupported_provider'
  | 'network';

export interface ChatErrorPayload {
  code: ChatErrorCode;
  message: string;
  /** HTTP status echoed for the UI. */
  status?: number;
  /** Whether the upstream returned 429 — used to label the toast. */
  retryable?: boolean;
}

export interface ChatSuccessPayload {
  content: string;
  provider: string;
  model: string;
  /** Optional token-usage accounting when the upstream returns it. */
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
}

export type ChatResponse =
  | { ok: true; data: ChatSuccessPayload }
  | { ok: false; error: ChatErrorPayload };

export async function sendChat(req: ChatRequest): Promise<ChatResponse> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });

    // Try to parse JSON no matter the status — the route always returns
    // a normalized envelope.
    let body: ChatResponse | null = null;
    try {
      body = (await res.json()) as ChatResponse;
    } catch {
      return {
        ok: false,
        error: {
          code: 'upstream_error',
          status: res.status,
          message: `Unexpected response from server (${res.status})`,
          retryable: res.status >= 500,
        },
      };
    }

    if (!body) {
      return {
        ok: false,
        error: {
          code: 'network',
          message: 'Empty response from server',
          retryable: true,
        },
      };
    }

    return body;
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'network',
        message: err instanceof Error ? err.message : 'Network error',
        retryable: true,
      },
    };
  }
}

/**
 * Translate a structured error from the route into a user-friendly title
 * for the toast. Keeping this here means the route stays provider-agnostic
 * and the UI owns the messaging.
 */
export function describeError(err: ChatErrorPayload, providerLabel: string): {
  title: string;
  body: string;
  severity: 'warn' | 'error';
} {
  switch (err.code) {
    case 'missing_credentials':
      return {
        title: `${providerLabel} key missing`,
        body: err.message || 'Open Settings and add an API key for this provider.',
        severity: 'warn',
      };
    case 'invalid_credentials':
      return {
        title: `${providerLabel} key rejected`,
        body: err.message || 'The provider did not accept the key. Double-check it in Settings.',
        severity: 'error',
      };
    case 'rate_limited':
      return {
        title: `${providerLabel} rate limited`,
        body:
          err.message ||
          'You hit the rate limit on this provider. Try another configured key, or wait a moment.',
        severity: 'warn',
      };
    case 'unsupported_provider':
      return {
        title: 'Unsupported provider',
        body: err.message || 'This provider is not configured on the server.',
        severity: 'error',
      };
    case 'upstream_error':
    case 'network':
    default:
      return {
        title: `${providerLabel} request failed`,
        body: err.message || 'Something went wrong talking to the provider. Try another key.',
        severity: 'error',
      };
  }
}
