'use client';

import { useCallback, useMemo, useState } from 'react';
import { Plus, MessageSquare, Settings as SettingsIcon, User, Trash2 } from 'lucide-react';
import { useSessionStore } from '@/lib/session-context';
import { useProviders } from '@/lib/provider-context';
import { requestFocusInput } from '@/lib/focus-bus';
import ClientOnly from './ClientOnly';
import { useTheme } from '@/lib/theme-context';
import clsx from 'clsx';

/**
 * Sidebar — ChatGPT/Gemini paradigm.
 *
 *   ┌───────────────────────┐
 *   │ [+ NEW CHAT]          │  top
 *   ├───────────────────────┤
 *   │  Session 01   [trash] │  scrollable
 *   │  Session 02           │
 *   │  ...                  │
 *   ├───────────────────────┤
 *   │ [⚙] Settings  [user]  │  bottom
 *   └───────────────────────┘
 */
export default function Sidebar() {
  const { sessions, activeSessionId, newSession, selectSession, removeSession } =
    useSessionStore();
  const { openSettings, activeProvider } = useProviders();
  const { theme } = useTheme();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Sort: most-recent first.
  const ordered = useMemo(
    () => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions],
  );

  const handleNew = useCallback(async () => {
    newSession();
    requestFocusInput();
  }, [newSession]);

  return (
    <aside
      className="flex flex-col h-full border-r"
      style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-elev-1)' }}
      aria-label="Chat history"
    >
      {/* Top — New Chat */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--border-soft)' }}>
        <button
          onClick={handleNew}
          className="w-full h-10 flex items-center justify-center gap-2 border font-mono text-[11px] tracking-[0.14em] uppercase transition-colors"
          style={{
            background: 'var(--active-bg)',
            color: 'var(--active-fg)',
            borderColor: 'var(--border-strong)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-contrast)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--active-bg)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--active-fg)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)';
          }}
          title="Start a fresh chat session"
        >
          <Plus size={14} />
          <span>NEW_CHAT</span>
        </button>
      </div>

      {/* Middle — scrollable sessions */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
        <div className="flex items-center justify-between px-2 py-1 mb-1">
          <span className="font-mono text-[9px] tracking-[0.18em] uppercase" style={{ color: 'var(--text-mute)' }}>
            RECENT
          </span>
          <span className="font-mono text-[9px] tracking-[0.18em] uppercase tabular-nums" style={{ color: 'var(--text-mute)' }}>
            {ordered.length} TOTAL
          </span>
        </div>

        {ordered.length === 0 ? (
          <div className="px-3 py-6 text-center font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: 'var(--text-mute)' }}>
            NO_SESSIONS
          </div>
        ) : (
          <ul className="space-y-0.5">
            {ordered.map((s, idx) => {
              const isActive = s.id === activeSessionId;
              const isConfirming = confirmId === s.id;
              return (
                <li key={s.id}>
                  <div
                    className={clsx(
                      'group flex items-stretch border',
                      isActive ? 'border-[var(--border-strong)]' : 'border-transparent',
                      !isActive && 'hover:border-[var(--border-soft)]',
                    )}
                    style={{
                      background: isActive ? 'var(--active-bg)' : 'transparent',
                      color: isActive ? 'var(--active-fg)' : 'var(--text)',
                    }}
                  >
                    <button
                      onClick={() => selectSession(s.id)}
                      className="flex-1 min-w-0 text-left px-2 py-2 flex items-start gap-2"
                      title={s.title}
                    >
                      <MessageSquare size={11} className="mt-0.5 flex-shrink-0" style={{ opacity: isActive ? 0.8 : 0.6 }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[11px] tracking-[0.04em] uppercase truncate">
                          {s.title}
                        </div>
                        <div className="font-mono text-[9px] tracking-[0.14em] uppercase mt-0.5 truncate" style={{ color: isActive ? 'var(--active-fg)' : 'var(--text-mute)', opacity: 0.7 }}>
                          {s.messageCount} MSG · <ClientOnly fallback={null}>{new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</ClientOnly>
                        </div>
                      </div>
                      <span className="font-mono text-[9px] tabular-nums flex-shrink-0 pt-0.5" style={{ color: isActive ? 'var(--active-fg)' : 'var(--text-mute)', opacity: 0.5 }}>
                        #{String(idx + 1).padStart(2, '0')}
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isConfirming) {
                          removeSession(s.id);
                          setConfirmId(null);
                        } else {
                          setConfirmId(s.id);
                          window.setTimeout(() => setConfirmId((c) => (c === s.id ? null : c)), 2200);
                        }
                      }}
                      className="w-7 flex items-center justify-center border-l"
                      style={{
                        borderColor: isActive ? 'var(--active-fg)' : 'var(--border-soft)',
                        color: isActive ? 'var(--active-fg)' : 'var(--text-mute)',
                      }}
                      title={isConfirming ? 'Click again to confirm delete' : 'Delete session'}
                      aria-label="Delete session"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                  {isConfirming && (
                    <div
                      className="mx-2 mb-1 px-2 py-1 font-mono text-[9px] tracking-[0.14em] uppercase"
                      style={{
                        background: isActive ? 'var(--active-bg)' : 'var(--bg-elev-2)',
                        color: isActive ? 'var(--active-fg)' : 'var(--text)',
                      }}
                    >
                      CONFIRM? Click trash again
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Bottom — Settings + User */}
      <div className="border-t px-3 py-3 space-y-2" style={{ borderColor: 'var(--border-soft)' }}>
        <button
          onClick={openSettings}
          className="w-full h-9 flex items-center gap-2 px-3 border font-mono text-[10px] tracking-[0.14em] uppercase"
          style={{
            background: 'transparent',
            color: 'var(--text-dim)',
            borderColor: 'var(--border)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
          }}
        >
          <SettingsIcon size={12} />
          <span>SETTINGS</span>
        </button>
        <div className="flex items-center gap-2 px-2 py-2 border" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg)' }}>
          <div
            className="w-7 h-7 flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--active-bg)', color: 'var(--active-fg)' }}
          >
            <User size={13} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[10px] tracking-[0.14em] uppercase truncate" style={{ color: 'var(--text)' }}>
              LOCAL_USER
            </div>
            <div className="font-mono text-[8px] tracking-[0.2em] uppercase truncate" style={{ color: 'var(--text-mute)' }}>
              {theme.toUpperCase()} · {activeProvider.toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}