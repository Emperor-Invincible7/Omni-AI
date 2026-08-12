'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Eye, EyeOff, Key, Server, Cpu, Zap, Sparkles, Trash2, ExternalLink, Check, AlertCircle, RotateCcw } from 'lucide-react';
import { useProviders } from '@/lib/provider-context';
import { PROVIDERS, PROVIDER_ORDER, maskKey, type ProviderId, type StoredCredentials } from '@/lib/providers';
import clsx from 'clsx';

const iconForProvider: Record<ProviderId, React.ReactNode> = {
  anthropic: <Sparkles size={14} />,
  groq: <Zap size={14} />,
  cerebras: <Cpu size={14} />,
  custom: <Server size={14} />,
};

type DraftState = Partial<StoredCredentials>;

function keyFieldFor(id: ProviderId): keyof StoredCredentials | null {
  switch (id) {
    case 'anthropic':
      return 'anthropic';
    case 'groq':
      return 'groq';
    case 'cerebras':
      return 'cerebras';
    case 'custom':
      return 'customKey';
  }
}

export default function SettingsModal() {
  const { settingsOpen, closeSettings, credentials, setCredentials } = useProviders();
  const [draft, setDraft] = useState<DraftState>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [savedTick, setSavedTick] = useState<number>(0);

  // Reset draft whenever the modal opens.
  useEffect(() => {
    if (settingsOpen) {
      setDraft(credentials);
      setRevealed({});
    }
  }, [settingsOpen, credentials]);

  // Lock body scroll while modal is open.
  useEffect(() => {
    if (!settingsOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [settingsOpen]);

  // Esc to close.
  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSettings();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [settingsOpen, closeSettings]);

  const update = useCallback(
    (patch: DraftState) => setDraft((d) => ({ ...d, ...patch })),
    [],
  );

  const save = useCallback(() => {
    setCredentials(draft);
    setSavedTick(Date.now());
  }, [draft, setCredentials]);

  const reset = useCallback(() => setDraft(credentials), [credentials]);

  const clearProvider = useCallback(
    (id: ProviderId) => {
      const field = keyFieldFor(id);
      const patch: DraftState = {};
      if (field) {
        switch (field) {
          case 'anthropic': patch.anthropic = undefined; break;
          case 'groq': patch.groq = undefined; break;
          case 'cerebras': patch.cerebras = undefined; break;
          case 'customKey': patch.customKey = undefined; break;
        }
      }
      if (id === 'custom') {
        patch.customBaseUrl = undefined;
        patch.customModel = undefined;
      }
      update(patch);
    },
    [update],
  );

  if (!settingsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeSettings();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl bg-black border border-white max-h-[88vh] flex flex-col">
        <header className="px-5 py-4 border-b border-white flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Key size={14} className="text-white" />
              <h2 className="text-[14px] font-bold tracking-[0.18em] uppercase">
                PROVIDER_CONFIG
              </h2>
            </div>
            <p className="text-[11px] text-[#A3A3A3] mt-1.5 max-w-md font-mono tracking-[0.06em]">
              Keys live in localStorage. They are only sent to the matching provider.
            </p>
          </div>
          <button onClick={closeSettings} className="nx-icon-btn" title="Close" aria-label="Close">
            <X size={14} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {savedTick > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 border border-white font-mono text-[10px] tracking-[0.14em] uppercase text-white">
              <Check size={12} />
              SAVED · CHANGES_APPLIED
            </div>
          )}

          {PROVIDER_ORDER.map((id) => {
            const p = PROVIDERS[id];
            const field = keyFieldFor(id);
            const storedValue = field && credentials[field] ? String(credentials[field]) : '';
            const draftValue = field && draft[field] ? String(draft[field]) : storedValue;
            const hasValue = !!draftValue && draftValue.length > 0;
            const requiresKey = p.requiresUserKey || id === 'anthropic';

            return (
              <section key={id} className="border border-[#1F1F1F]">
                <header className="px-4 py-3 flex items-start gap-3 border-b border-[#1F1F1F]">
                  <div className="w-9 h-9 border border-white flex items-center justify-center text-white">
                    {iconForProvider[id]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[13px] font-bold tracking-[0.12em] uppercase text-white">
                        {p.label}
                      </h3>
                      <span className="tag tag-on">{p.tagline}</span>
                    </div>
                    <p className="text-[10px] text-[#A3A3A3] mt-1 font-mono">
                      {id === 'anthropic' && 'OPTIONAL · ENV_VAR ANTHROPIC_API_KEY IS DEFAULT'}
                      {id === 'groq' && 'BEARER · OPENAI_COMPAT'}
                      {id === 'cerebras' && 'BEARER · OPENAI_COMPAT'}
                      {id === 'custom' && 'POINT_AT_ANY_OPENAI_COMPAT_ENDPOINT'}
                    </p>
                  </div>
                  {p.keyHelpUrl && (
                    <a
                      href={p.keyHelpUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="nx-icon-btn"
                      title="Where do I get a key?"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </header>

                <div className="p-4 space-y-3">
                  {id === 'custom' ? (
                    <>
                      <Field
                        label="BASE_URL"
                        placeholder="http://localhost:11434/v1"
                        value={draft.customBaseUrl ?? ''}
                        onChange={(v) => update({ customBaseUrl: v })}
                        help="Ollama: http://localhost:11434/v1 · OpenRouter: https://openrouter.ai/api/v1"
                      />
                      <Field
                        label="API_KEY"
                        placeholder="(optional for local Ollama)"
                        value={draft.customKey ?? ''}
                        onChange={(v) => update({ customKey: v })}
                        help="Sent as Authorization: Bearer. Empty for unauthenticated."
                        maskedPreview={maskKey(draft.customKey)}
                        isRevealed={!!revealed.customKey}
                        onToggleReveal={() => setRevealed((r) => ({ ...r, customKey: !r.customKey }))}
                      />
                      <Field
                        label="MODEL_ID_OVERRIDE"
                        placeholder="llama3.1, qwen2.5-coder:32b, gpt-4o-mini…"
                        value={draft.customModel ?? ''}
                        onChange={(v) => update({ customModel: v })}
                        help="Optional. Sent verbatim as the model id."
                      />
                    </>
                  ) : (
                    <Field
                      label="API_KEY"
                      placeholder={
                        id === 'anthropic' ? 'sk-ant-…' : id === 'groq' ? 'gsk_…' : 'csk-…'
                      }
                      value={draftValue}
                      onChange={(v) => update(field ? ({ [field]: v } as DraftState) : {})}
                      help={
                        requiresKey
                          ? 'Sent as Bearer (Groq/Cerebras) or x-api-key (Anthropic).'
                          : 'Optional override of the server-side key.'
                      }
                      maskedPreview={maskKey(draftValue)}
                      isRevealed={!!revealed[id]}
                      onToggleReveal={() => setRevealed((r) => ({ ...r, [id]: !r[id] }))}
                    />
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="font-mono text-[10px] tracking-[0.14em] uppercase">
                      {hasValue ? (
                        <span className="inline-flex items-center gap-2 text-white">
                          <span className="w-1.5 h-1.5 bg-white" /> CONFIGURED_LOCALLY
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-[#525252]">
                          <AlertCircle size={11} /> NOT_CONFIGURED
                          {id !== 'anthropic' && ' · WILL_REQUIRE_SETUP'}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => clearProvider(id)}
                      disabled={!hasValue}
                      className="nx-btn disabled:opacity-50"
                    >
                      <Trash2 size={11} /> CLEAR
                    </button>
                  </div>
                </div>
              </section>
            );
          })}

          <div className="font-mono text-[10px] tracking-[0.06em] text-[#525252] px-1 leading-relaxed">
            Storage key <code className="text-[#A3A3A3]">[wiki-ai:providers:v1]</code>. Clearing site data wipes keys.
          </div>
        </div>

        <footer className="px-5 py-3 border-t border-white flex items-center justify-between">
          <button onClick={reset} className="nx-btn">
            <RotateCcw size={11} /> REVERT
          </button>
          <div className="flex items-center gap-2">
            <button onClick={closeSettings} className="nx-btn">CANCEL</button>
            <button onClick={save} className="nx-btn border-white bg-white text-black hover:bg-[#EDEDED]">
              SAVE_CHANGES
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  help?: string;
  maskedPreview?: string;
  isRevealed?: boolean;
  onToggleReveal?: () => void;
}

function Field({ label, placeholder, value, onChange, help, maskedPreview, isRevealed, onToggleReveal }: FieldProps) {
  const isSecret = typeof onToggleReveal === 'function';
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#A3A3A3]">
          {label}
        </label>
        {isSecret && maskedPreview && value && (
          <span className="font-mono text-[10px] text-[#A3A3A3] tabular-nums">{maskedPreview}</span>
        )}
      </div>
      <div className="relative">
        <input
          type={isSecret && !isRevealed ? 'password' : 'text'}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-9 bg-black border border-[#1F1F1F] focus:border-white px-3 font-mono text-[12px] text-white placeholder:text-[#525252] outline-none"
        />
        {isSecret && (
          <button
            type="button"
            onClick={onToggleReveal}
            className="absolute right-2 top-1/2 -translate-y-1/2 nx-icon-btn"
            title={isRevealed ? 'Hide' : 'Show'}
          >
            {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        )}
      </div>
      {help && (
        <p className="mt-1.5 font-mono text-[10px] tracking-[0.06em] text-[#525252] leading-relaxed">
          {help}
        </p>
      )}
    </div>
  );
}