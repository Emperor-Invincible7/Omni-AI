'use client';

import { useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, X, ArrowRight, Settings as SettingsIcon } from 'lucide-react';
import { useProviders } from '@/lib/provider-context';
import { PROVIDERS } from '@/lib/providers';

const severityMeta: Record<string, { Icon: typeof AlertCircle; accent: string }> = {
  warn: { Icon: AlertTriangle, accent: 'text-white' },
  error: { Icon: AlertCircle, accent: 'text-white' },
  info: { Icon: Info, accent: 'text-white' },
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

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[90] w-[min(520px,calc(100vw-2rem))]">
      <div className="bg-black border border-white overflow-hidden">
        <div className="px-4 py-3 flex items-start gap-3">
          <div className="w-7 h-7 border border-white flex items-center justify-center flex-shrink-0">
            <Icon size={13} className={severityMeta[error.severity]?.accent ?? 'text-white'} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-mono text-[12px] font-bold tracking-[0.1em] uppercase text-white truncate">
                {error.title}
              </h4>
              <span className="tag tag-on">{error.severity.toUpperCase()}</span>
            </div>
            <p className="text-[12px] text-[#A3A3A3] mt-1 leading-relaxed">{error.message}</p>

            {error.suggestedProviders.length > 0 && (
              <div className="mt-3">
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#525252] mb-1.5">
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
                        <span className="text-[#525252]">·</span>
                        <span className="text-[#A3A3A3]">{model.label}</span>
                        <ArrowRight size={10} />
                      </button>
                    );
                  })}
                  <button
                    onClick={() => {
                      openSettings();
                      dismissError();
                    }}
                    className="nx-btn"
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
          className="h-[2px] bg-white origin-left"
          style={{
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