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
  listSessionsAction,
  createSessionAction,
  deleteSessionAction,
  loadSessionMessagesAction,
  saveTurnAction,
} from '@/app/actions';
import type { MessageRow, SessionSummary } from '@/lib/sessions';

interface SessionStoreValue {
  sessions: SessionSummary[];
  activeSessionId: string | null;
  messages: MessageRow[];
  loading: boolean;

  newSession: () => Promise<string>;
  selectSession: (id: string) => Promise<void>;
  persistTurn: (args: {
    userContent: string;
    assistantContent: string;
    metrics?: Record<string, unknown>;
  }) => Promise<{ ok: true; messageIds: string[] } | { ok: false; error: string }>;
  removeSession: (id: string) => Promise<void>;
  resetClientState: () => void;
}

const SessionContext = createContext<SessionStoreValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Initial fetch — never throw to the UI.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listSessionsAction();
        if (!cancelled && mountedRef.current) setSessions(list);
      } catch {
        /* DB may not be initialized yet — render empty. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const newSession = useCallback(async (): Promise<string> => {
    const id = await createSessionAction();
    if (!mountedRef.current) return id;
    setSessions((prev) => [
      { id, title: 'New Chat', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messageCount: 0, preview: null },
      ...prev,
    ]);
    setActiveSessionId(id);
    setMessages([]);
    return id;
  }, []);

  const selectSession = useCallback(async (id: string) => {
    setActiveSessionId(id);
    setLoading(true);
    try {
      const msgs = await loadSessionMessagesAction(id);
      if (!mountedRef.current) return;
      setMessages(msgs);
    } catch {
      if (mountedRef.current) setMessages([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const persistTurn = useCallback(
    async (args: { userContent: string; assistantContent: string; metrics?: Record<string, unknown> }) => {
      if (!activeSessionId) return { ok: false as const, error: 'no_session' };
      const result = await saveTurnAction({
        sessionId: activeSessionId,
        userContent: args.userContent,
        assistantContent: args.assistantContent,
        metrics: args.metrics,
      });
      if (!result.ok) return result;
      try {
        const list = await listSessionsAction();
        if (mountedRef.current) setSessions(list);
      } catch {
        /* non-fatal */
      }
      return result;
    },
    [activeSessionId],
  );

  const removeSession = useCallback(
    async (id: string) => {
      await deleteSessionAction(id);
      if (!mountedRef.current) return;
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setActiveSessionId((prev) => {
        if (prev === id) {
          setMessages([]);
          return null;
        }
        return prev;
      });
    },
    [],
  );

  const resetClientState = useCallback(() => {
    setMessages([]);
    setActiveSessionId(null);
  }, []);

  const value = useMemo<SessionStoreValue>(
    () => ({
      sessions,
      activeSessionId,
      messages,
      loading,
      newSession,
      selectSession,
      persistTurn,
      removeSession,
      resetClientState,
    }),
    [sessions, activeSessionId, messages, loading, newSession, selectSession, persistTurn, removeSession, resetClientState],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionStore(): SessionStoreValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSessionStore must be used within SessionProvider');
  return ctx;
}