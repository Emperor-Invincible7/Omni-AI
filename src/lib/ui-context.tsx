'use client';

import { useState, createContext, useContext, useCallback, ReactNode } from 'react';

export type NavId = 'chat' | 'library' | 'agents' | 'settings';

interface UIState {
  sidebarOpen: boolean;
  panelOpen: boolean;
  activeTab: 'context' | 'metrics' | 'sources';
  activeNav: NavId;
  toggleSidebar: () => void;
  togglePanel: () => void;
  setActiveTab: (tab: 'context' | 'metrics' | 'sources') => void;
  setActiveNav: (nav: NavId) => void;
}

const UIContext = createContext<UIState | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'context' | 'metrics' | 'sources'>('context');
  const [activeNav, setActiveNav] = useState<NavId>('chat');

  // Wrap in useCallback so consumer memoization isn't invalidated every render.
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const togglePanel = useCallback(() => setPanelOpen((v) => !v), []);

  return (
    <UIContext.Provider
      value={{
        sidebarOpen,
        panelOpen,
        activeTab,
        activeNav,
        toggleSidebar,
        togglePanel,
        setActiveTab,
        setActiveNav,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
};
