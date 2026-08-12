'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  PanelLeft,
  ChevronDown,
  Check,
  Sun,
  Moon,
  Cpu,
} from 'lucide-react';
import { useProviders } from '@/lib/provider-context';
import { PROVIDERS, PROVIDER_ORDER, type ProviderId } from '@/lib/providers';
import { useTheme } from '@/lib/theme-context';
import { useSessionStore } from '@/lib/session-context';
import OmniLogo from './OmniLogo';
import ClientOnly from './ClientOnly';
import clsx from 'clsx';

const providerIcon: Record<ProviderId, string> = {
  anthropic: '◆',
  groq: '▸',
  cerebras: '◇',
  ollama: '□',
  gemini: '◈',
};

interface TopHeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  tokensUsed: number;
  tokensMax: number;
}

export default function TopHeader({
  onToggleSidebar,
  sidebarOpen,
  tokensUsed,
  tokensMax,
}: TopHeaderProps) {
  const { activeProvider, activeModel, setActive, credentials } = useProviders();
  const { theme, toggleTheme } = useTheme();
  const { activeSessionId } = useSessionStore();

  const provider = PROVIDERS[activeProvider];
  const model = provider.models.find((m) => m.id === activeModel) ?? provider.models[0];

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const isCredentialed = useCallback(
    (id: ProviderId): boolean => {
      switch (id) {
        case 'anthropic':
          return true;
        case 'groq':
          return Boolean(credentials.groq?.trim());
        case 'cerebras':
          return Boolean(credentials.cerebras?.trim());
        case 'ollama':
          return true;
        case 'gemini':
          return Boolean(credentials.gemini?.trim());
      }
    },
    [credentials],
  );

  const tokensPct = useMemo(() => Math.min(100, (tokensUsed / tokensMax) * 100), [tokensUsed, tokensMax]);
  const tokensLabel = useMemo(() => {
    const used = tokensUsed >= 1000 ? `${(tokensUsed / 1000).toFixed(1)}k` : `${tokensUsed}`;
    const max = tokensMax >= 1000 ? `${(tokensMax / 1000).toFixed(0)}k` : `${tokensMax}`;
    return `${used} / ${max}`;
  }, [tokensUsed, tokensMax]);

  return (
    <header
      className="h-14 flex items-stretch border-b flex-shrink-0"
      style={{
        background: 'var(--bg)',
        borderColor: 'var(--border-soft)',
      }}
      role="banner"
    >
      {/* Left: sidebar toggle + brand */}
      <div className="flex items-stretch" style={{ borderRight: '1px solid var(--border-soft)' }}>
        <button
          onClick={onToggleSidebar}
          className="w-12 h-full flex items-center justify-center border-r"
          style={{
            borderColor: 'var(--border-soft)',
            color: sidebarOpen ? 'var(--text)' : 'var(--text-dim)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--hover-bg)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = sidebarOpen
              ? 'var(--text)'
              : 'var(--text-dim)';
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-label="Toggle sidebar"
        >
          <PanelLeft size={16} />
        </button>
        <div className="flex items-center gap-2 px-4 min-w-[180px]">
          <OmniLogo size={18} className="" />
          <div className="leading-none">
            <div className="font-bold tracking-[0.2em] uppercase text-[13px]">OMNI-AI</div>
            <div className="font-mono text-[9px] tracking-[0.18em] uppercase mt-0.5" style={{ color: 'var(--text-mute)' }}>
              v1.0 · MATRIX
            </div>
          </div>
        </div>
      </div>

      {/* Center: model switcher (absolutely centered) */}
      <div className="flex-1 flex items-center justify-center">
        <div ref={rootRef} className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 h-9 px-3 border font-mono text-[10px] tracking-[0.14em] uppercase"
            style={{
              background: 'var(--bg)',
              color: 'var(--text)',
              borderColor: 'var(--border)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
            }}
            title="Switch provider / model"
          >
            <Cpu size={12} style={{ color: 'var(--accent)' }} />
            <span>{provider.label.toUpperCase()}</span>
            <span style={{ color: 'var(--text-mute)' }}>·</span>
            <span style={{ color: 'var(--text-dim)' }}>{model.label}</span>
            <ChevronDown
              size={11}
              className={clsx('transition-transform', open && 'rotate-180')}
              style={{ color: 'var(--text-mute)' }}
            />
          </button>

          {open && (
            <div
              className="absolute z-50 left-1/2 -translate-x-1/2 mt-2 w-[340px] border"
              style={{
                background: 'var(--bg)',
                color: 'var(--text)',
                borderColor: 'var(--border-strong)',
              }}
              role="menu"
            >
              {/* Header */}
              <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-soft)' }}>
                <div className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: 'var(--text-mute)' }}>
                  ACTIVE_MODEL
                </div>
                <div className="font-mono text-[12px] tracking-[0.04em] mt-1">
                  {provider.label.toUpperCase()} · {model.label}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
                  {model.description}
                </div>
              </div>

              {/* Provider list */}
              <div className="max-h-[360px] overflow-y-auto">
                {PROVIDER_ORDER.map((id) => {
                  const p = PROVIDERS[id];
                  const isActive = id === activeProvider;
                  const ready = isCredentialed(id);
                  return (
                    <div key={id} style={{ borderBottom: '1px solid var(--border-soft)' }} className="last:border-b-0">
                      <button
                        onClick={() => {
                          setActive(id);
                        }}
                        className={clsx(
                          'w-full flex items-center gap-3 px-3 py-2 text-left font-mono text-[11px] tracking-[0.1em] uppercase transition-colors',
                        )}
                        style={{
                          background: isActive ? 'var(--active-bg)' : 'transparent',
                          color: isActive ? 'var(--active-fg)' : 'var(--text)',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--hover-bg)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                        }}
                      >
                        <span className="w-3 text-center">{providerIcon[id]}</span>
                        <span className="flex-1 text-left">{p.label}</span>
                        {isActive && <Check size={11} />}
                        {!ready && (
                          <span className="font-mono text-[9px] tracking-[0.2em]" style={{ color: isActive ? 'var(--active-fg)' : 'var(--text-dim)', opacity: 0.7 }}>
                            NEEDS_KEY
                          </span>
                        )}
                      </button>
                      {isActive && (
                        <div style={{ background: 'var(--bg-elev-1)', borderTop: '1px solid var(--border-soft)' }}>
                          {p.models.map((m) => {
                            const isModel = m.id === activeModel;
                            return (
                              <button
                                key={m.id}
                                onClick={() => setActive(id, m.id)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-left font-mono text-[11px] uppercase tracking-[0.06em]"
                                style={{
                                  color: isModel ? 'var(--text)' : 'var(--text-dim)',
                                  background: isModel ? 'var(--bg-elev-2)' : 'transparent',
                                }}
                              >
                                <span className="w-3 text-center">{isModel ? '●' : '○'}</span>
                                <span className="flex-1 text-left">{m.label}</span>
                                <span className="font-mono text-[10px]" style={{ color: 'var(--text-mute)' }}>
                                  {m.description}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: token badge + theme toggle */}
      <div className="flex items-stretch" style={{ borderLeft: '1px solid var(--border-soft)' }}>
        <div
          className="flex items-center gap-2 px-3 font-mono text-[10px] tracking-[0.14em] uppercase"
          style={{ color: 'var(--text-dim)', borderRight: '1px solid var(--border-soft)' }}
          title="Token usage"
        >
          <span style={{ color: 'var(--text-mute)' }}>TOK</span>
          <span style={{ color: 'var(--text)' }} className="tabular-nums">{tokensLabel}</span>
          <div className="w-12 h-[2px]" style={{ background: 'var(--border-soft)' }}>
            <div
              className="h-full"
              style={{
                width: `${tokensPct}%`,
                background: theme === 'light' ? 'var(--accent)' : 'var(--text)',
              }}
            />
          </div>
          <span className="tabular-nums" style={{ color: 'var(--text-mute)' }}>{tokensPct.toFixed(0)}%</span>
        </div>
        <button
          onClick={toggleTheme}
          className="w-12 h-full flex items-center justify-center border-r"
          style={{
            borderColor: 'var(--border-soft)',
            color: 'var(--text-dim)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--hover-bg)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)';
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          <ClientOnly fallback={<Moon size={14} />}>
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </ClientOnly>
        </button>
        <div
          className="flex items-center gap-2 px-3 font-mono text-[10px] tracking-[0.14em] uppercase"
          style={{ color: 'var(--text-mute)' }}
          title="Active session id"
        >
          <span>SES</span>
          <ClientOnly fallback="······">
            <span className="tabular-nums" style={{ color: 'var(--text-dim)' }}>
              {activeSessionId.slice(-6).toUpperCase()}
            </span>
          </ClientOnly>
        </div>
      </div>
    </header>
  );
}