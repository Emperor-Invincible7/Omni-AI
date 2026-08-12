'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  Terminal, Database, BarChart2,
  Trash2, FileText, ChevronRight,
} from 'lucide-react';
import { useWorkspace, type WorkspaceTab } from '@/lib/workspace-context';
import ChartRenderer from './ChartRenderer';
import ClientOnly from './ClientOnly';
import clsx from 'clsx';

const TABS: Array<{ id: WorkspaceTab; label: string; icon: typeof Terminal }> = [
  { id: 'terminal', label: 'TERMINAL',  icon: Terminal },
  { id: 'data',     label: 'DATA VIEW', icon: Database },
  { id: 'preview',  label: 'PREVIEW',   icon: BarChart2 },
];

export default function Workspace() {
  const { activeTab, setActiveTab, logs, clearLogs, activeFile, latestChart, isStreaming, lastLatencyMs } = useWorkspace();

  return (
    <aside
      className="flex flex-col h-full flex-shrink-0 border-l"
      style={{
        background: 'var(--bg-elev-1)',
        borderColor: 'var(--border-soft)',
        width: '100%',
        minWidth: 0,
      }}
      data-testid="workspace-pane"
    >
      {/* Tab strip */}
      <div
        className="flex items-stretch border-b flex-shrink-0"
        style={{ borderColor: 'var(--border-soft)' }}
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 h-9 font-mono text-[10px] tracking-[0.18em] uppercase border-r transition-colors',
              )}
              style={{
                background: active ? 'var(--bg)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-dim)',
                borderColor: 'var(--border-soft)',
                borderBottom: active ? '2px solid var(--accent)' : '1px solid var(--border-soft)',
              }}
              aria-pressed={active}
            >
              <Icon size={12} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'terminal' && (
          <TerminalView logs={logs} onClear={clearLogs} isStreaming={isStreaming} latencyMs={lastLatencyMs} />
        )}
        {activeTab === 'data' && <DataView file={activeFile} />}
        {activeTab === 'preview' && <PreviewView chart={latestChart} isStreaming={isStreaming} />}
      </div>
    </aside>
  );
}

/* ---------------- Tabs ---------------- */

function TerminalView({
  logs,
  onClear,
  isStreaming,
  latencyMs,
}: {
  logs: ReturnType<typeof useWorkspace>['logs'];
  onClear: () => void;
  isStreaming: boolean;
  latencyMs: number | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  const levelColor = (lvl: string) => {
    switch (lvl) {
      case 'ERROR': return 'var(--accent)';
      case 'WARN': return 'var(--accent)';
      case 'OK': return 'var(--accent)';
      case 'STREAM': return 'var(--accent)';
      default: return 'var(--text-mute)';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header
        className="px-3 py-2 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--border-soft)' }}
      >
        <div className="flex items-center gap-2 font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: 'var(--text-mute)' }}>
          <span
            className="w-2 h-2"
            style={{
              background: isStreaming ? 'var(--accent)' : 'var(--text-mute)',
              animation: isStreaming ? 'pulse 1s infinite' : undefined,
            }}
          />
          {isStreaming ? 'STREAMING' : 'IDLE'}
          {latencyMs != null && !isStreaming && (
            <>
              <span>·</span>
              <span className="tabular-nums">{latencyMs}ms</span>
            </>
          )}
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1 font-mono text-[9px] tracking-[0.18em] uppercase"
          style={{ color: 'var(--text-mute)' }}
        >
          <Trash2 size={10} /> CLEAR
        </button>
      </header>
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed"
        style={{ color: 'var(--text)' }}
      >
        {logs.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-mute)' }}>
            <div className="text-[9px] tracking-[0.2em] uppercase">NO_LOGS</div>
          </div>
        ) : (
          logs.map((l) => (
            <div key={l.id} className="flex items-start gap-2 mb-1">
              <ClientOnly fallback={<span className="tabular-nums" style={{ color: 'var(--text-mute)' }}>--:--:--</span>}>
                <span className="tabular-nums flex-shrink-0" style={{ color: 'var(--text-mute)' }}>
                  {new Date(l.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </ClientOnly>
              <span className="flex-shrink-0 tracking-[0.18em] uppercase" style={{ color: levelColor(l.level) }}>
                [{l.level}]
              </span>
              <span className="flex-1 break-words">{l.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DataView({ file }: { file: ReturnType<typeof useWorkspace>['activeFile'] }) {
  if (!file) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center text-center px-6"
        style={{ color: 'var(--text-mute)' }}
      >
        <Database size={28} className="mb-3" style={{ color: 'var(--border)' }} />
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase">NO_DATA_ATTACHED</div>
        <p className="text-[12px] mt-2 max-w-xs leading-relaxed">
          Attach a CSV / JSON / TXT file via the paperclip icon. Parsing happens in your browser.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header
        className="px-3 py-2 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--border-soft)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={12} style={{ color: 'var(--accent)' }} />
          <div className="min-w-0">
            <div className="font-mono text-[11px] tracking-[0.06em] uppercase truncate" style={{ color: 'var(--text)' }}>
              {file.name}
            </div>
            <div className="font-mono text-[9px] tracking-[0.18em] uppercase" style={{ color: 'var(--text-mute)' }}>
              {file.kind.toUpperCase()} · {file.kind === 'csv' ? `${file.totalRows ?? 0} ROWS · ${file.columnCount ?? 0} COLS` : 'OBJECT'}
            </div>
          </div>
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-auto p-3">
        {file.kind === 'csv' && file.previewRows && file.previewRows.length > 0 ? (
          <CsvTable rows={file.previewRows} />
        ) : (
          <pre
            className="border p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
            }}
          >
            {file.summary}
          </pre>
        )}
      </div>
    </div>
  );
}

function CsvTable({ rows }: { rows: Array<Record<string, unknown>> }) {
  const columns = useMemo(() => {
    const seen = new Set<string>();
    const cols: string[] = [];
    for (const r of rows) {
      for (const k of Object.keys(r)) {
        if (!seen.has(k)) {
          seen.add(k);
          cols.push(k);
        }
      }
    }
    return cols;
  }, [rows]);

  return (
    <div className="border overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
      <table className="omni-table w-full text-[12px]" style={{ color: 'var(--text)' }}>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th
                key={i}
                className="font-mono text-[10px] tracking-[0.14em] uppercase text-left px-2 py-1.5 border-b whitespace-nowrap"
                style={{
                  background: 'var(--bg)',
                  color: 'var(--text-dim)',
                  borderColor: 'var(--border)',
                }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c, j) => (
                <td
                  key={j}
                  className="px-2 py-1.5 border-b font-mono text-[11px] tabular-nums whitespace-nowrap"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {r[c] === undefined || r[c] === null ? <span style={{ color: 'var(--text-mute)' }}>∅</span> : String(r[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreviewView({
  chart,
  isStreaming,
}: {
  chart: ReturnType<typeof useWorkspace>['latestChart'];
  isStreaming: boolean;
}) {
  if (isStreaming) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center text-center px-6 font-mono text-[11px] tracking-[0.18em] uppercase"
        style={{ color: 'var(--accent)' }}
      >
        <div
          className="w-3 h-3 mb-3"
          style={{
            background: 'var(--accent)',
            animation: 'pulse 1.2s infinite',
          }}
        />
        PROCESSING_DATASET · CHART_PENDING
        <p
          className="normal-case tracking-normal text-[11px] mt-2 leading-relaxed max-w-xs"
          style={{ color: 'var(--text-mute)' }}
        >
          Charts render only after the AI finishes streaming to avoid browser hangs.
        </p>
      </div>
    );
  }

  if (!chart) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center text-center px-6"
        style={{ color: 'var(--text-mute)' }}
      >
        <ChevronRight size={28} className="mb-3" style={{ color: 'var(--border)' }} />
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase">NO_CHART_YET</div>
        <p className="text-[12px] mt-2 max-w-xs leading-relaxed">
          Ask the AI for a comparison or distribution and a chart will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-3">
      <ChartRenderer spec={chart} isStreaming={isStreaming} />
    </div>
  );
}