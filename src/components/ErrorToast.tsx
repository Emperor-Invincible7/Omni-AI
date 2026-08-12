'use client';

import { useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, X, ArrowRight, Settings as SettingsIcon } from 'lucide-react';
import { useProviders } from '@/lib/provider-context';
import { PROVIDERS } from '@/lib/providers';

const severityMeta: Record<string, { Icon: typeof AlertCircle; color: string }> = {
  warn: { Icon: AlertTriangle, color: 'var(--text)' },
  error: { Icon: AlertCircle, color: 'var(--accent)' },
  info: { Icon: Info, color: 'var(--text)' },
};

const AUTO_DISMISS_MS = 9000;

export default function ErrorToast() {
  const { error, dismissError, setActive, openSettings } = useProviders();

  useEffect(() => {
    if (!error) return;
    const t = window.setTimeout(() => dismissError(), AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [error, dismissError]);

  if (!error) return null;
  const Icon = severityMeta[error.severity]?.Icon ?? Info;
  const iconColor = severityMeta[error.severity]?.color ?? 'var(--text)';

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] w-[min(520px,calc(100vw-2rem))]"
      role="status"
      aria-live="polite"
    >
      <div
        className="overflow-hidden border"
        style={{
          background: 'var(--bg)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text)',
        }}
      >
        <div className="px-4 py-3 flex items-start gap-3">
          <div
            className="w-7 h-7 border flex items-center justify-center flex-shrink-0"
            style={{ borderColor: iconColor, color: iconColor }}
          >
            <Icon size={13} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-mono text-[12px] font-bold tracking-[0.1em] uppercase truncate">
                {error.title}
              </h4>
              <span
                className="px-1.5 py-0.5 font-mono text-[9px] tracking-[0.18em] uppercase border"
                style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
              >
                {error.severity.toUpperCase()}
              </span>
            </div>
            <p className="text-[12px] mt-1 leading-relaxed" style={{ color: 'var(--text-dim)' }}>
              {error.message}
            </p>

            {error.suggestedProviders.length > 0 && (
              <div className="mt-3">
                <div
                  className="font-mono text-[9px] uppercase tracking-[0.2em] mb-1.5"
                  style={{ color: 'var(--text-mute)' }}
                >
                  TRY_SWITCHING_TO
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {error.suggestedProviders.slice(0, 3).map((id) => {
                    const p = PROVIDERS[id];
                    const model = p.models[0];
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          setActive(id);
                          dismissError();
                        }}
                        className="flex items-center gap-1.5 nx-btn"
                        title={`Switch to ${p.label}`}
                      >
                        <span>{p.label.toUpperCase()}</span>
                        <span style={{ color: 'var(--text-mute)' }}>·</span>
                        <span style={{ color: 'var(--text-dim)' }}>{model.label}</span>
                        <ArrowRight size={10} />
                      </button>
                    );
                  })}
                  <button
                    onClick={() => {
                      openSettings();
                      dismissError();
                    }}
                    className="flex items-center gap-1.5 nx-btn"
                  >
                    <SettingsIcon size={10} />
                    ADD_KEY
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={dismissError}
            className="nx-icon-btn flex-shrink-0"
            title="Dismiss"
            aria-label="Dismiss"
          >
            <X size={12} />
          </button>
        </div>

        <div
          className="h-[2px] origin-left"
          style={{
            background: 'var(--accent)',
            animation: `nx-toast-bar ${AUTO_DISMISS_MS}ms linear forwards`,
          }}
        />
        <style jsx>{`
          @keyframes nx-toast-bar {
            from { transform: scaleX(1); }
            to   { transform: scaleX(0); }
          }
        `}</style>
      </div>
    </div>
  );
}