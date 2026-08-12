'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  hydrated: boolean;
}

const STORAGE_KEY = 'omni-ai:theme:v1';
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'dark' || raw === 'light') return raw;
  } catch {
    /* ignore */
  }
  return 'dark';
}

/**
 * ThemeProvider — drives the `data-theme` attribute on <html> so all CSS
 * variables cascade globally. Hydrates from localStorage on mount.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from storage on first mount.
  useEffect(() => {
    setThemeState(readStoredTheme());
    setHydrated(true);
  }, []);

  // Sync to <html> attribute + persist.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, hydrated }}>
      {children}
    </ThemeContext.Provider>
  );
}

const DEFAULT_THEME_VALUE: ThemeContextValue = {
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
  hydrated: true,
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  return ctx ?? DEFAULT_THEME_VALUE;
}