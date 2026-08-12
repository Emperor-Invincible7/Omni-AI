'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * UIContext is preserved as a thin compatibility wrapper for the layout
 * hierarchy. Most layout state (sidebar open, panel toggles) is now
 * local to the page component since the app no longer has a complex
 * nested dock/panel structure.
 */
interface UIContextValue {
  /** No-op placeholder — retained so existing consumers don't break. */
  noop: () => void;
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  return (
    <UIContext.Provider value={{ noop: () => undefined }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
}

export type NavId = 'chat' | 'library' | 'agents' | 'settings';