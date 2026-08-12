'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  X, Eye, EyeOff, Key, Server, Cpu, Zap, Sparkles, Trash2,
  ExternalLink, Check, AlertCircle, RotateCcw, ServerCog,
} from 'lucide-react';
import { useProviders } from '@/lib/provider-context';
import { PROVIDERS, PROVIDER_ORDER, maskKey, type ProviderId, type StoredCredentials } from '@/lib/providers';

const iconForProvider: Record<ProviderId, React.ReactNode> = {
  anthropic: <Sparkles size={14} />,
  groq: <Zap size={14} />,
  cerebras: <Cpu size={14} />,
  ollama: <Server size={14} />,
  gemini: <Sparkles size={14} />,
};

type DraftState = Partial<StoredCredentials>;

/**
 * Map provider → credential key field. Ollama is a special case (no API key;
 * only a custom base URL).
 */
function keyFieldFor(id: ProviderId): keyof StoredCredentials | null {
  switch (id) {
    case 'anthropic':
      return 'anthropic';
    case 'groq':
      return 'groq';
    case 'cerebras':
      return 'cerebras';
    case 'ollama':
      return null;
    case 'gemini':
      return 'gemini';
  }
}

export default function SettingsModal() {
  const { settingsOpen, closeSettings, credentials, setCredentials } = useProviders();
  const [draft, setDraft] = useState<DraftState>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [savedTick, setSavedTick] = useState<number>(0);

  useEffect(() => {
    if (settingsOpen) {
      setDraft(credentials);
      setRevealed({});
    }
  }, [settingsOpen, credentials]);

  useEffect(() => {
    if (!settingsOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [settingsOpen]);

  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSettings();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [settingsOpen, closeSettings]);

  const update = useCallback((patch: DraftState) => setDraft((d) => ({ ...d, ...patch })), []);

  const save = useCallback(() => {
    setCredentials(draft);
    setSavedTick(Date.now());
  }, [draft, setCredentials]);

  const reset = useCallback(() => setDraft(credentials), [credentials]);

  const clearProvider = useCallback(
    (id: ProviderId) => {
      const patch: DraftState = {};
      switch (id) {
        case 'anthropic': patch.anthropic = undefined; break;
        case 'groq': patch.groq = undefined; break;
        case 'cerebras': patch.cerebras = undefined; break;
        case 'gemini': patch.gemini = undefined; break;
        case 'ollama':
          patch.customBaseUrl = undefined;
          patch.customKey = undefined;
          patch.customModel = undefined;
          break;
      }
      update(patch);
    },
    [update],
  );

  if (!settingsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'var(--bg-overlay)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeSettings();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-2xl border flex flex-col max-h-[88vh]"
        style={{
          background: 'var(--bg)',
          color: 'var(--text)',
          borderColor: 'var(--border-strong)',
        }}
      >
        <header
          className="px-5 py-4 border-b flex items-start justify-between"
          style={{ borderColor: 'var(--border)' }}
        >
          <div>
            <div className="flex items-center gap-2">
              <Key size={14} className="" />
              <h2 className="text-[14px] font-bold tracking-[0.18em] uppercase">
                PROVIDER_CONFIG
              </h2>
            </div>
            <p
              className="text-[11px] mt-1.5 max-w-md font-mono tracking-[0.06em]"
              style={{ color: 'var(--text-dim)' }}
            >
              Keys live in localStorage. They are only sent to the matching provider.
            </p>
          </div>
          <button
            onClick={closeSettings}
            className="nx-icon-btn"
            title="Close"
            aria-label="Close"
            style={{ color: 'var(--text-dim)' }}
          >
            <X size={14} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {savedTick > 0 && (
            <div
              className="flex items-center gap-2 px-3 py-2 border font-mono text-[10px] tracking-[0.14em] uppercase"
              style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
            >
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

            return (
              <section
                key={id}
                className="border"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-elev-1)' }}
              >
                <header
                  className="px-4 py-3 flex items-start gap-3 border-b"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div
                    className="w-9 h-9 border flex items-center justify-center"
                    style={{ borderColor: 'var(--border-strong)', color: 'var(--text)' }}
                  >
                    {iconForProvider[id]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[13px] font-bold tracking-[0.12em] uppercase">
                        {p.label}
                      </h3>
                      <span
                        className="px-1.5 py-0.5 border font-mono text-[9px] tracking-[0.14em] uppercase"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
                      >
                        {p.tagline}
                      </span>
                    </div>
                    <p
                      className="text-[10px] mt-1 font-mono"
                      style={{ color: 'var(--text-dim)' }}
                    >
                      {id === 'anthropic' && 'OPTIONAL · ENV_VAR ANTHROPIC_API_KEY IS DEFAULT'}
                      {id === 'groq' && 'BEARER · OPENAI_COMPAT'}
                      {id === 'cerebras' && 'BEARER · OPENAI_COMPAT'}
                      {id === 'ollama' && 'POINT_AT_LOCAL_OLLAMA · http://localhost:11434/v1'}
                      {id === 'gemini' && 'GOOGLE_API_KEY · GENERATIVE_LANGUAGE_API'}
                    </p>
                  </div>
                  {p.keyHelpUrl && (
                    <a
                      href={p.keyHelpUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="nx-icon-btn"
                      style={{ color: 'var(--text-dim)' }}
                      title="Where do I get a key?"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </header>

                <div className="p-4 space-y-3">
                  {id === 'ollama' ? (
                    <>
                      <Field
                        label="BASE_URL"
                        placeholder="http://localhost:11434/v1"
                        value={draft.customBaseUrl ?? ''}
                        onChange={(v) => update({ customBaseUrl: v })}
                        help="Ollama default: http://localhost:11434/v1. Override for remote."
                      />
                      <Field
                        label="MODEL_ID_OVERRIDE"
                        placeholder="llama3.2, qwen2.5, mistral …"
                        value={draft.customModel ?? ''}
                        onChange={(v) => update({ customModel: v })}
                        help="Optional. Sent verbatim as the model id."
                      />
                      <Field
                        label="API_KEY"
                        placeholder="(leave blank for local Ollama)"
                        value={draft.customKey ?? ''}
                        onChange={(v) => update({ customKey: v })}
                        help="Optional. Sent as Authorization: Bearer if set."
                        maskedPreview={maskKey(draft.customKey)}
                        isRevealed={!!revealed.ollamaKey}
                        onToggleReveal={() => setRevealed((r) => ({ ...r, ollamaKey: !r.ollamaKey }))}
                      />
                    </>
                  ) : (
                    <Field
                      label="API_KEY"
                      placeholder={
                        id === 'anthropic'
                          ? 'sk-ant-…'
                          : id === 'groq'
                            ? 'gsk_…'
                            : id === 'gemini'
                              ? 'AIzaSy…'
                              : 'csk-…'
                      }
                      value={draftValue}
                      onChange={(v) => update(field ? ({ [field]: v } as DraftState) : {})}
                      help={
                        id === 'gemini'
                          ? 'Passed as ?key= query param to the Google Generative Language API.'
                          : 'Sent as Bearer (Groq/Cerebras/Gemini) or x-api-key (Anthropic).'
                      }
                      maskedPreview={maskKey(draftValue)}
                      isRevealed={!!revealed[id]}
                      onToggleReveal={() => setRevealed((r) => ({ ...r, [id]: !r[id] }))}
                    />
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="font-mono text-[10px] tracking-[0.14em] uppercase">
                      {hasValue ? (
                        <span className="inline-flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                          <span className="w-1.5 h-1.5" style={{ background: 'var(--accent)' }} /> CONFIGURED_LOCALLY
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-2"
                          style={{ color: 'var(--text-mute)' }}
                        >
                          <AlertCircle size={11} /> NOT_CONFIGURED
                          {p.requiresUserKey && ' · WILL_REQUIRE_SETUP'}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => clearProvider(id)}
                      disabled={!hasValue && id !== 'ollama'}
                      className="nx-btn disabled:opacity-50"
                    >
                      <Trash2 size={11} /> CLEAR
                    </button>
                  </div>
                </div>
              </section>
            );
          })}

          <div
            className="font-mono text-[10px] tracking-[0.06em] px-1 leading-relaxed"
            style={{ color: 'var(--text-mute)' }}
          >
            Storage key <code style={{ color: 'var(--text-dim)' }}>[omni-ai:providers:v1]</code>. Clearing site data wipes keys.
          </div>
        </div>

        <footer
          className="px-5 py-3 border-t flex items-center justify-between"
          style={{ borderColor: 'var(--border)' }}
        >
          <button onClick={reset} className="nx-btn">
            <RotateCcw size={11} /> REVERT
          </button>
          <div className="flex items-center gap-2">
            <button onClick={closeSettings} className="nx-btn">CANCEL</button>
            <button
              onClick={save}
              className="nx-btn"
              style={{
                background: 'var(--active-bg)',
                color: 'var(--active-fg)',
                borderColor: 'var(--border-strong)',
              }}
            >
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
        <label
          className="font-mono text-[10px] tracking-[0.2em] uppercase"
          style={{ color: 'var(--text-dim)' }}
        >
          {label}
        </label>
        {isSecret && maskedPreview && value && (
          <span
            className="font-mono text-[10px] tabular-nums"
            style={{ color: 'var(--text-dim)' }}
          >
            {maskedPreview}
          </span>
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
          className="w-full h-9 border px-3 font-mono text-[12px] outline-none"
          style={{
            background: 'var(--bg)',
            color: 'var(--text)',
            borderColor: 'var(--border)',
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--border-strong)';
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--border)';
          }}
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
        <p
          className="mt-1.5 font-mono text-[10px] tracking-[0.06em] leading-relaxed"
          style={{ color: 'var(--text-mute)' }}
        >
          {help}
        </p>
      )}
    </div>
  );
}