'use client';

import { useUI } from '@/lib/ui-context';

interface StatusBarProps {
  /** Token usage numbers — when 0 we show idle placeholder. */
  tokensUsed: number;
  tokensMax: number;
  modelLabel: string;
  providerLabel: string;
  isStreaming: boolean;
  sessionId: string;
}

/**
 * Slim monospaced status bar. 1px borders, square corners.
 * Lives between the top dock and the chat canvas.
 */
export default function StatusBar({
  tokensUsed,
  tokensMax,
  modelLabel,
  providerLabel,
  isStreaming,
  sessionId,
}: StatusBarProps) {
  const { togglePanel } = useUI();
  const pct = Math.min(100, Math.round((tokensUsed / tokensMax) * 1000) / 10);

  // Convert raw number into a readable fixed-width counter (e.g. 47,231)
  const fmt = (n: number) =>
    n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return (
    <div
      className="flex items-stretch border-b border-white/20 bg-black font-mono text-[10px] tracking-[0.14em] uppercase text-[#A3A3A3] select-none"
      role="status"
      aria-live="polite"
    >
      {/* Left cell — session + status */}
      <div className="flex items-center gap-3 px-3 border-r border-white/20 py-1.5">
        <span className="w-1.5 h-1.5 bg-white animate-dot-pulse" aria-hidden />
        <span className="text-white">{isStreaming ? 'STREAMING' : 'READY'}</span>
        <span className="text-[#525252]">·</span>
        <span>SES_{sessionId}</span>
      </div>

      {/* Model cell */}
      <div className="flex items-center gap-3 px-3 border-r border-white/20 py-1.5">
        <span className="text-[#525252]">MODEL</span>
        <span className="text-white">{modelLabel}</span>
        <span className="text-[#525252]">·</span>
        <span>{providerLabel}</span>
      </div>

      {/* Token usage cell — explicit counter + visual bar */}
      <div className="flex items-center gap-3 px-3 border-r border-white/20 py-1.5 flex-1 min-w-0">
        <span className="text-[#525252]">TOKENS</span>
        <span className="text-white tabular-nums">{fmt(tokensUsed)}</span>
        <span className="text-[#525252]">/ {fmt(tokensMax)}</span>

        <div className="flex-1 min-w-[80px] max-w-[240px] h-[2px] bg-[#1F1F1F] mx-2">
          <div
            className="h-full bg-white"
            style={{ width: `${pct}%` }}
            aria-label={`${pct}% used`}
          />
        </div>

        <span className="tabular-nums text-[#A3A3A3]">{pct.toFixed(1)}%</span>
      </div>

      {/* Operations toggle */}
      <button
        onClick={togglePanel}
        className="px-3 border-l border-white/20 hover:text-white hover:bg-[#0A0A0A] py-1.5"
        title="Toggle operations panel"
      >
        OPS ▸
      </button>
    </div>
  );
}
