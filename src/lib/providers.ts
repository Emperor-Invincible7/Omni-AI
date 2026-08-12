/**
 * Provider configuration for multi-model routing.
 *
 * WikiAi supports four provider families:
 *  - Anthropic (default; uses native Anthropic Messages API)
 *  - Groq       (OpenAI-compatible, requires Bearer auth)
 *  - Cerebras   (OpenAI-compatible, requires Bearer auth)
 *  - Custom     (OpenAI-compatible; user-supplied base URL — Ollama, OpenRouter, LM Studio, etc.)
 *
 * The provider record here is the single source of truth for routing.
 * `authStyle` tells the API router how to inject credentials:
 *   - 'anthropic'  →  x-api-key + anthropic-version headers
 *   - 'bearer'     →  Authorization: Bearer <key>
 */

export type AuthStyle = 'anthropic' | 'bearer';

export type ProviderId = 'anthropic' | 'groq' | 'cerebras' | 'custom';

export interface ModelInfo {
  /** Provider-side identifier sent to the API. */
  id: string;
  /** Human label for the UI. */
  label: string;
  /** Short description shown under the model name in the picker. */
  description: string;
}

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  /** Short tagline shown in the picker. */
  tagline: string;
  /** Base URL used by the backend route handler (server-side). */
  baseUrl: string;
  /** Auth header style. */
  authStyle: AuthStyle;
  /** Whether this provider requires the user to supply a key locally. */
  requiresUserKey: boolean;
  /** Whether the provider family speaks the OpenAI Chat Completions schema. */
  openAICompatible: boolean;
  /** Accent color token used in the UI. */
  accent: 'emerald' | 'cyan' | 'indigo' | 'amber';
  /** Available models for this provider. */
  models: ModelInfo[];
  /** Default model id when this provider is selected. */
  defaultModel: string;
  /** Optional URL the user can visit to obtain a key. */
  keyHelpUrl?: string;
}

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    tagline: 'Default · Claude Opus 5',
    baseUrl: 'https://api.anthropic.com',
    authStyle: 'anthropic',
    requiresUserKey: false,
    openAICompatible: false,
    accent: 'emerald',
    models: [
      {
        id: 'claude-opus-5',
        label: 'Claude Opus 5',
        description: 'Most capable · reasoning & long context',
      },
      {
        id: 'claude-sonnet-5',
        label: 'Claude Sonnet 5',
        description: 'Balanced speed & quality',
      },
      {
        id: 'claude-haiku-4-5',
        label: 'Claude Haiku 4.5',
        description: 'Fastest · low latency',
      },
    ],
    defaultModel: 'claude-opus-5',
  },
  groq: {
    id: 'groq',
    label: 'Groq',
    tagline: 'Ultra-fast inference',
    baseUrl: 'https://api.groq.com/openai/v1',
    authStyle: 'bearer',
    requiresUserKey: true,
    openAICompatible: true,
    accent: 'cyan',
    keyHelpUrl: 'https://console.groq.com/keys',
    models: [
      {
        id: 'llama-3.3-70b-versatile',
        label: 'Llama 3.3 70B Versatile',
        description: 'High quality · 128k context',
      },
      {
        id: 'llama-3.1-8b-instant',
        label: 'Llama 3.1 8B Instant',
        description: 'Low latency · high throughput',
      },
    ],
    defaultModel: 'llama-3.3-70b-versatile',
  },
  cerebras: {
    id: 'cerebras',
    label: 'Cerebras',
    tagline: 'Wafer-scale speed',
    baseUrl: 'https://api.cerebras.ai/v1',
    authStyle: 'bearer',
    requiresUserKey: true,
    openAICompatible: true,
    accent: 'indigo',
    keyHelpUrl: 'https://cloud.cerebras.ai/',
    models: [
      {
        id: 'llama3.1-70b',
        label: 'Llama 3.1 70B',
        description: 'High quality reasoning',
      },
      {
        id: 'llama3.1-8b',
        label: 'Llama 3.1 8B',
        description: 'Fast inference',
      },
    ],
    defaultModel: 'llama3.1-70b',
  },
  custom: {
    id: 'custom',
    label: 'Local / Custom',
    tagline: 'Ollama · OpenRouter · self-hosted',
    baseUrl: '', // user-supplied at runtime
    authStyle: 'bearer',
    requiresUserKey: false, // user can leave blank for Ollama
    openAICompatible: true,
    accent: 'amber',
    models: [
      {
        id: 'auto',
        label: 'Auto-detect',
        description: 'Use the model set by the server',
      },
    ],
    defaultModel: 'auto',
  },
};

export const PROVIDER_ORDER: ProviderId[] = ['anthropic', 'groq', 'cerebras', 'custom'];

/** Storage shape persisted to localStorage. */
export interface StoredCredentials {
  /** Anthropic key (server-side env takes precedence; this is fallback). */
  anthropic?: string;
  groq?: string;
  cerebras?: string;
  /** Custom endpoint URL + optional key + model override. */
  customBaseUrl?: string;
  customKey?: string;
  customModel?: string;
  /** Last selected provider + model — restored on next visit. */
  activeProvider?: ProviderId;
  activeModel?: string;
}

export const STORAGE_KEY = 'wiki-ai:providers:v1';

/** True when a provider needs the user to have entered a usable credential. */
export function providerHasCredential(
  id: ProviderId,
  creds: StoredCredentials,
): boolean {
  switch (id) {
    case 'anthropic':
      // Anthropic uses the server env var by default; user can override but it's not required.
      return true;
    case 'groq':
      return Boolean(creds.groq && creds.groq.trim().length > 0);
    case 'cerebras':
      return Boolean(creds.cerebras && creds.cerebras.trim().length > 0);
    case 'custom':
      return Boolean(creds.customBaseUrl && creds.customBaseUrl.trim().length > 0);
  }
}

/** Returns a human-readable credential preview (••••1234) for safe display. */
export function maskKey(key: string | undefined): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return `••••••••${key.slice(-4)}`;
}
