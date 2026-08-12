'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronDown, Check, Key, Settings as SettingsIcon } from 'lucide-react';
import { useProviders } from '@/lib/provider-context';
import { PROVIDERS, PROVIDER_ORDER, type ProviderId } from '@/lib/providers';
import clsx from 'clsx';

const providerIcon: Record<ProviderId, string> = {
  anthropic: '◆',
  groq: '▸',
  cerebras: '◇',
  custom: '□',
};

export default function ModelSwitcher() {
  const { activeProvider, activeModel, setActive, credentials, openSettings } = useProviders();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const provider = PROVIDERS[activeProvider];
  const model = provider.models.find((m) => m.id === activeModel) ?? provider.models[0];

  const isCredentialed = useCallback(
    (id: ProviderId): boolean => {
      switch (id) {
        case 'anthropic':
          return true;
        case 'groq':
          return Boolean(credentials.groq?.trim());
        case 'cerebras':
          return Boolean(credentials.cerebras?.trim());
        case 'custom':
          return Boolean(credentials.customBaseUrl?.trim());
      }
    },
    [credentials],
  );

  // Click-outside / Esc to close — keep listeners only while open.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 h-7 px-2 border border-transparent hover:border-white font-mono text-[11px] tracking-[0.14em] uppercase"
        title="Switch provider / model"
      >
        <span className="text-white">{providerIcon[activeProvider]}</span>
        <span className="text-white">{provider.label.toUpperCase()}</span>
        <span className="text-[#525252]">·</span>
        <span className="text-[#A3A3A3]">{model.label}</span>
        <ChevronDown
          size={11}
          className={clsx('transition-transform text-[#A3A3A3]', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 right-0 mt-2 w-[320px] bg-black border border-white text-white"
          role="menu"
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-[#1F1F1F]">
            <div className="text-[9px] tracking-[0.2em] uppercase text-[#525252]">
              ACTIVE_MODEL
            </div>
            <div className="font-mono text-[12px] tracking-[0.04em] mt-1 text-white">
              {provider.label.toUpperCase()} · {model.label}
            </div>
            <div className="text-[10px] text-[#A3A3A3] mt-0.5">{model.description}</div>
          </div>

          {/* Provider list */}
          <div className="max-h-[360px] overflow-y-auto">
            {PROVIDER_ORDER.map((id) => {
              const p = PROVIDERS[id];
              const isActive = id === activeProvider;
              const ready = isCredentialed(id);
              return (
                <div key={id} className="border-b border-[#1F1F1F] last:border-b-0">
                  <button
                    onClick={() => setActive(id)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2 text-left font-mono text-[11px] tracking-[0.1em] uppercase transition-colors',
                      isActive
                        ? 'bg-white text-black'
                        : 'hover:bg-[#0A0A0A] text-white',
                    )}
                  >
                    <span className="w-3 text-center">{providerIcon[id]}</span>
                    <span className="flex-1">{p.label}</span>
                    {isActive && <Check size={11} />}
                    {!ready && (
                      <span className="flex items-center gap-1 text-[9px] tracking-[0.2em] text-[#A3A3A3]">
                        <Key size={9} /> NEEDS_KEY
                      </span>
                    )}
                  </button>

                  {/* Models for active provider */}
                  {isActive && (
                    <div className="bg-[#0A0A0A] border-t border-[#1F1F1F]">
                      {p.models.map((m) => {
                        const isModel = m.id === activeModel;
                        return (
                          <button
                            key={m.id}
                            onClick={() => setActive(id, m.id)}
                            className={clsx(
                              'w-full flex items-center gap-2 px-3 py-1.5 text-left font-mono text-[11px] uppercase tracking-[0.06em]',
                              isModel ? 'text-white' : 'text-[#A3A3A3] hover:text-white',
                            )}
                          >
                            <span className="w-3 text-center">{isModel ? '●' : '○'}</span>
                            <span className="flex-1">{m.label}</span>
                            <span className="text-[10px] text-[#525252] normal-case tracking-normal">
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

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-[#1F1F1F]">
            <span className="text-[9px] tracking-[0.18em] uppercase text-[#525252]">
              LOCAL_STORAGE_ONLY
            </span>
            <button
              onClick={() => {
                setOpen(false);
                openSettings();
              }}
              className="flex items-center gap-1 font-mono text-[10px] tracking-[0.14em] uppercase text-white border border-[#1F1F1F] hover:border-white px-2 py-1"
            >
              <SettingsIcon size={10} /> MANAGE_KEYS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
