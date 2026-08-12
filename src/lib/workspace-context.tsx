'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { ParsedFile } from './file-parser';
import type { ChartSpec } from '@/components/MarkdownView';

export type WorkspaceMode = 'chat' | 'code' | 'analyze';
export type WorkspaceTab = 'terminal' | 'data' | 'preview';

export interface TerminalLogEntry {
  id: string;
  /** Monotonic timestamp in ms. */
  ts: number;
  /** Severity tag shown in caps. */
  level: 'INFO' | 'WARN' | 'ERROR' | 'OK' | 'STREAM';
  message: string;
}

interface WorkspaceContextValue {
  mode: WorkspaceMode;
  setMode: (m: WorkspaceMode) => void;

  activeTab: WorkspaceTab;
  setActiveTab: (t: WorkspaceTab) => void;

  /** The most recently attached parsed file. Displayed in Data View. */
  activeFile: ParsedFile | null;
  setActiveFile: (f: ParsedFile | null) => void;

  /** The most recent chart spec from an AI message. Rendered in Preview. */
  latestChart: ChartSpec | null;
  setLatestChart: (c: ChartSpec | null) => void;

  /** True while the canvas is waiting on the AI. */
  isStreaming: boolean;
  setIsStreaming: (v: boolean) => void;

  /** Last latency (ms) for the most recent turn. */
  lastLatencyMs: number | null;
  setLastLatencyMs: (ms: number | null) => void;

  /** Append a log entry to the terminal. */
  pushLog: (level: TerminalLogEntry['level'], message: string) => void;
  logs: TerminalLogEntry[];
  clearLogs: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

const MAX_LOGS = 200;

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<WorkspaceMode>('chat');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('terminal');
  const [activeFile, setActiveFile] = useState<ParsedFile | null>(null);
  const [latestChart, setLatestChart] = useState<ChartSpec | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [logs, setLogs] = useState<TerminalLogEntry[]>([]);

  // Drop the chart when a new chat starts so the right pane doesn't show stale data.
  const lastFileRef = useRef<ParsedFile | null>(null);

  const pushLog = useCallback((level: TerminalLogEntry['level'], message: string) => {
    setLogs((prev) => {
      const entry: TerminalLogEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ts: Date.now(),
        level,
        message,
      };
      const next = [...prev, entry];
      if (next.length > MAX_LOGS) next.splice(0, next.length - MAX_LOGS);
      return next;
    });
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  const setMode = useCallback((m: WorkspaceMode) => {
    setModeState(m);
    pushLog('INFO', `mode → ${m.toUpperCase()}`);
  }, [pushLog]);

  const setActiveFileAndRecord = useCallback((f: ParsedFile | null) => {
    setActiveFile(f);
    lastFileRef.current = f;
    if (f) {
      pushLog('OK', `file attached: ${f.name} (${f.kind.toUpperCase()})`);
      setActiveTab('data');
    }
  }, [pushLog]);

  const setLatestChartAndRecord = useCallback((c: ChartSpec | null) => {
    setLatestChart(c);
    if (c) {
      pushLog('OK', `chart parsed: ${c.type.toUpperCase()} · ${c.data.length} pts · ${c.series.length} series`);
      setActiveTab('preview');
    }
  }, [pushLog]);

  // Initial log entry on mount.
  useEffect(() => {
    pushLog('INFO', 'omni-ai runtime :: online');
  }, [pushLog]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      mode,
      setMode,
      activeTab,
      setActiveTab,
      activeFile,
      setActiveFile: setActiveFileAndRecord,
      latestChart,
      setLatestChart: setLatestChartAndRecord,
      isStreaming,
      setIsStreaming,
      lastLatencyMs,
      setLastLatencyMs,
      pushLog,
      logs,
      clearLogs,
    }),
    [
      mode,
      setMode,
      activeTab,
      activeFile,
      setActiveFileAndRecord,
      latestChart,
      setLatestChartAndRecord,
      isStreaming,
      lastLatencyMs,
      pushLog,
      logs,
      clearLogs,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}