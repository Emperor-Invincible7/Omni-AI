'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { History, Trash2 } from 'lucide-react';
import { useSessionStore } from '@/lib/session-context';
import clsx from 'clsx';

export default function SessionList() {
  const { sessions, activeSessionId: activeId, selectSession, removeSession } = useSessionStore();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onPick = useCallback(
    (id: string) => {
      setOpen(false);
      void selectSession(id);
    },
    [selectSession],
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 h-7 px-2 font-mono text-[10px] tracking-[0.14em] uppercase text-[#A3A3A3] hover:text-white border border-transparent hover:border-white"
        title="Session history"
      >
        <History size={12} />
        HISTORY
        <span className="text-[#525252]">·</span>
        <span className="tabular-nums">{sessions.length}</span>
      </button>

      {open && (
        <div className="absolute z-50 right-0 mt-2 w-[360px] max-h-[420px] overflow-y-auto bg-black border border-white">
          <header className="px-3 py-2 border-b border-[#1F1F1F] flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase">SESSIONS</span>
            <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-[#525252]">
              {sessions.length} TOTAL
            </span>
          </header>
          {sessions.length === 0 ? (
            <div className="px-3 py-6 font-mono text-[10px] tracking-[0.14em] uppercase text-[#525252] text-center">
              NO_SESSIONS
            </div>
          ) : (
            <ul>
              {sessions.map((s) => {
                const active = s.id === activeId;
                return (
                  <li
                    key={s.id}
                    className={clsx(
                      'border-b border-[#1F1F1F] last:border-b-0',
                      active && 'bg-white text-black',
                    )}
                  >
                    <button
                      onClick={() => onPick(s.id)}
                      className={clsx(
                        'w-full text-left px-3 py-2 flex items-start gap-2',
                        active ? 'hover:bg-[#EDEDED]' : 'hover:bg-[#0A0A0A]',
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[11px] tracking-[0.06em] uppercase truncate">
                          {s.title}
                        </div>
                        <div className={clsx(
                          'font-mono text-[9px] tracking-[0.14em] uppercase mt-0.5 flex items-center gap-2',
                          active ? 'text-[#404040]' : 'text-[#525252]')}>
                          <span>{s.messageCount} MSG</span>
                          <span>·</span>
                          <span>{new Date(s.updatedAt).toLocaleString()}</span>
                        </div>
                        {s.preview && (
                          <div className={clsx(
                            'text-[11px] mt-1 truncate',
                            active ? 'text-[#404040]' : 'text-[#A3A3A3]')}>
                            {s.preview}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete session "${s.title}"?`)) void removeSession(s.id);
                        }}
                        className={clsx(
                          'w-6 h-6 flex items-center justify-center border',
                          active ? 'border-black text-black hover:bg-[#EDEDED]' : 'border-[#1F1F1F] text-[#525252] hover:border-white hover:text-white',
                        )}
                        title="Delete session"
                        aria-label="Delete session"
                      >
                        <Trash2 size={11} />
                      </button>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}