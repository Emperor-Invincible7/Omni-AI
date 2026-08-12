/**
 * Provider configuration for multi-model routing.
 *
 * OMNI-AI supports:
 *  - Anthropic   (Claude — native Anthropic Messages API)
 *  - Groq        (OpenAI-compatible, requires Bearer auth)
 *  - Cerebras    (OpenAI-compatible, requires Bearer auth)
 *  - Ollama      (OpenAI-compatible; user supplies base URL — http://localhost:11434/v1)
 *  - Gemini      (Google — uses Google Generative Language API)
 */

export type AuthStyle = 'anthropic' | 'bearer' | 'gemini';

export type ProviderId = 'anthropic' | 'groq' | 'cerebras' | 'ollama' | 'gemini';

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
  /** Optional accent color for picker chips. */
  accent: 'emerald' | 'cyan' | 'indigo' | 'amber' | 'rose';
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
    tagline: 'Claude family',
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
  ollama: {
    id: 'ollama',
    label: 'Ollama',
    tagline: 'Local · self-hosted',
    baseUrl: 'http://localhost:11434/v1',
    authStyle: 'bearer',
    requiresUserKey: false, // Ollama usually runs unauthenticated locally
    openAICompatible: true,
    accent: 'amber',
    models: [
      { id: 'llama3.2', label: 'Llama 3.2', description: 'Default local model' },
      { id: 'qwen2.5', label: 'Qwen 2.5', description: 'Strong reasoning' },
      { id: 'mistral', label: 'Mistral', description: 'Lightweight general' },
      { id: 'auto', label: 'Auto', description: 'Use whatever is running' },
    ],
    defaultModel: 'llama3.2',
  },
  gemini: {
    id: 'gemini',
    label: 'Gemini',
    tagline: 'Google · multimodal',
    baseUrl: 'https://generativelanguage.googleapis.com',
    authStyle: 'gemini',
    requiresUserKey: true,
    openAICompatible: false,
    accent: 'rose',
    keyHelpUrl: 'https://aistudio.google.com/apikey',
    models: [
      { id: 'gemini-flash-latest', label: 'Gemini Flash', description: 'Fast · multimodal · stable' },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Most capable · reasoning' },
    ],
    defaultModel: 'gemini-flash-latest',
  },
};

export const PROVIDER_ORDER: ProviderId[] = ['anthropic', 'groq', 'cerebras', 'ollama', 'gemini'];

/** Storage shape persisted to localStorage. */
export interface StoredCredentials {
  /** Anthropic key (server-side env takes precedence; this is fallback). */
  anthropic?: string;
  groq?: string;
  cerebras?: string;
  gemini?: string;
  /** Custom endpoint URL + optional key + model override. */
  customBaseUrl?: string;
  customKey?: string;
  customModel?: string;
  /** Last selected provider + model — restored on next visit. */
  activeProvider?: ProviderId;
  activeModel?: string;
}

export const STORAGE_KEY = 'omni-ai:providers:v1';

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
    case 'ollama':
      // Ollama uses default localhost; user can override base URL but it's optional.
      return true;
    case 'gemini':
      return Boolean(creds.gemini && creds.gemini.trim().length > 0);
  }
}

/** Returns a human-readable credential preview (••••1234) for safe display. */
export function maskKey(key: string | undefined): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return `••••••••${key.slice(-4)}`;
}