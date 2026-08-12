'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  PROVIDERS,
  STORAGE_KEY,
  providerHasCredential,
  type ProviderId,
  type StoredCredentials,
} from './providers';

export type ProviderErrorSeverity = 'info' | 'warn' | 'error';

export interface ProviderError {
  id: string;
  severity: ProviderErrorSeverity;
  title: string;
  message: string;
  /** Provider id that failed — used to suggest a fallback. */
  failedProvider: ProviderId;
  /** Other configured providers we can suggest the user switch to. */
  suggestedProviders: ProviderId[];
  createdAt: number;
}

interface ProviderContextValue {
  /** All credentials (loaded from localStorage). */
  credentials: StoredCredentials;
  /** Currently active provider id. */
  activeProvider: ProviderId;
  /** Currently active model id (must belong to activeProvider). */
  activeModel: string;
  /** Whether credentials have been hydrated from localStorage yet. */
  hydrated: boolean;

  /** Mutate one or more credential fields. Persists to localStorage. */
  setCredentials: (patch: Partial<StoredCredentials>) => void;

  /** Switch the active provider + model in one call. */
  setActive: (provider: ProviderId, model?: string) => void;

  /** Convenience: is the currently active provider fully configured? */
  isActiveReady: boolean;

  /** Currently displayed error toast (if any). */
  error: ProviderError | null;
  /** Raise a new error toast. Replaces any existing one. */
  reportError: (
    partial: Omit<ProviderError, 'id' | 'createdAt' | 'suggestedProviders'> & {
      suggestedProviders?: ProviderId[];
    },
  ) => void;
  dismissError: () => void;

  /** Open / close the settings modal. */
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

const ProviderContext = createContext<ProviderContextValue | undefined>(undefined);

function readStorage(): StoredCredentials {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredCredentials;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStorage(value: StoredCredentials) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Quota or privacy mode — fail silently rather than crash the UI.
  }
}

/**
 * Choose a sensible default when nothing is in storage. We default to
 * Anthropic (the server has the env var) — users can switch in the picker.
 */
function defaultActive(creds: StoredCredentials): {
  provider: ProviderId;
  model: string;
} {
  if (creds.activeProvider && PROVIDERS[creds.activeProvider]) {
    const provider = PROVIDERS[creds.activeProvider];
    const model =
      creds.activeModel && provider.models.some((m) => m.id === creds.activeModel)
        ? creds.activeModel
        : provider.defaultModel;
    return { provider: creds.activeProvider, model };
  }
  return { provider: 'anthropic', model: PROVIDERS.anthropic.defaultModel };
}

export function ProviderContextProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentialsState] = useState<StoredCredentials>({});
  const [activeProvider, setActiveProvider] = useState<ProviderId>('anthropic');
  const [activeModel, setActiveModel] = useState<string>(PROVIDERS.anthropic.defaultModel);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<ProviderError | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Avoid persisting before hydration (otherwise we'd wipe storage on first paint).
  const persistRef = useRef(false);
  // Latest credentials — lets callbacks read current state without retriggering
  // on every credentials change.
  const credentialsRef = useRef<StoredCredentials>({});

  // Hydrate from localStorage exactly once on mount.
  useEffect(() => {
    const stored = readStorage();
    const { provider, model } = defaultActive(stored);
    setCredentialsState(stored);
    credentialsRef.current = stored;
    setActiveProvider(provider);
    setActiveModel(model);
    setHydrated(true);
    // From this point onward, mutations are allowed to persist.
    persistRef.current = true;
  }, []);

  const setCredentials = useCallback((patch: Partial<StoredCredentials>) => {
    setCredentialsState((prev) => {
      const next = { ...prev, ...patch };
      credentialsRef.current = next;
      if (persistRef.current) writeStorage(next);
      return next;
    });
  }, []);

  const setActive = useCallback(
    (provider: ProviderId, model?: string) => {
      if (!PROVIDERS[provider]) return;
      const targetModel =
        model && PROVIDERS[provider].models.some((m) => m.id === model)
          ? model
          : PROVIDERS[provider].defaultModel;
      setActiveProvider(provider);
      setActiveModel(targetModel);
      setCredentialsState((prev) => {
        const next = { ...prev, activeProvider: provider, activeModel: targetModel };
        credentialsRef.current = next;
        if (persistRef.current) writeStorage(next);
        return next;
      });
      // Switching providers clears any error toast — the user took action.
      setError(null);
    },
    [],
  );

  const reportError = useCallback<ProviderContextValue['reportError']>(
    (partial) => {
      // Compute suggestions: providers that ARE configured, excluding the failing one.
      const current = credentialsRef.current;
      const suggestions =
        partial.suggestedProviders ??
        (Object.keys(PROVIDERS) as ProviderId[]).filter(
          (id) => id !== partial.failedProvider && providerHasCredential(id, current),
        );

      const err: ProviderError = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
        suggestedProviders: suggestions,
        ...partial,
      };
      setError(err);
    },
    [],
  );

  const dismissError = useCallback(() => setError(null), []);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const isActiveReady = useMemo(
    () => providerHasCredential(activeProvider, credentials),
    [activeProvider, credentials],
  );

  const value = useMemo<ProviderContextValue>(
    () => ({
      credentials,
      activeProvider,
      activeModel,
      hydrated,
      setCredentials,
      setActive,
      isActiveReady,
      error,
      reportError,
      dismissError,
      settingsOpen,
      openSettings,
      closeSettings,
    }),
    [
      credentials,
      activeProvider,
      activeModel,
      hydrated,
      setCredentials,
      setActive,
      isActiveReady,
      error,
      reportError,
      dismissError,
      settingsOpen,
      openSettings,
      closeSettings,
    ],
  );

  return <ProviderContext.Provider value={value}>{children}</ProviderContext.Provider>;
}

export function useProviders() {
  const ctx = useContext(ProviderContext);
  if (!ctx) throw new Error('useProviders must be used within ProviderContextProvider');
  return ctx;
}
