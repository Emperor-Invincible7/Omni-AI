'use client';

import { useMemo } from 'react';
import ChartRenderer from './ChartRenderer';

/**
 * Minimal but precise markdown renderer for OMNI-AI.
 * Handles:
 *   - Fenced code blocks ```lang
 *   - Markdown tables (| col | col |)
 *   - Inline code, **bold**, *italic*
 *   - ATX headings (#, ##, ###)
 *   - Unordered and ordered lists
 *   - json:chart fenced blocks → ChartRenderer
 *   - Plain paragraphs
 *
 * Exposes `extractChartSpec(content)` so the Workspace can mirror the
 * latest chart into the right-pane Preview tab without re-rendering
 * the markdown tree.
 */

export interface Block {
  kind: 'p' | 'h' | 'ul' | 'ol' | 'code' | 'table' | 'chart';
  level?: number;
  text?: string;
  lang?: string;
  rows?: string[][];
  chart?: ChartSpec;
}

export interface ChartSpec {
  type: 'line' | 'bar' | 'area';
  xKey: string;
  data: Array<Record<string, number | string>>;
  series: Array<{ key: string; label: string }>;
  height?: number;
}

export default function MarkdownView({ content, isStreaming = false }: { content: string; isStreaming?: boolean }) {
  const blocks = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div
      className="omni-md text-[14px] leading-relaxed space-y-3"
      style={{ color: 'var(--text)' }}
    >
      {blocks.map((b, i) => renderBlock(b, i, isStreaming))}
    </div>
  );
}

function renderBlock(b: Block, i: number, isStreaming: boolean) {
  switch (b.kind) {
    case 'h':
      return (
        <h3
          key={i}
          className={`font-bold tracking-tight ${headingCls(b.level ?? 3)}`}
          style={{ color: 'var(--text)' }}
        >
          {renderInline(b.text ?? '')}
        </h3>
      );
    case 'p':
      return (
        <p key={i} className="whitespace-pre-wrap">
          {renderInline(b.text ?? '')}
        </p>
      );
    case 'ul':
      return (
        <ul key={i} className="list-none space-y-1.5 pl-0">
          {b.text!.split('\n').map((line, j) => (
            <li key={j} className="flex gap-2">
              <span className="font-mono text-[12px] mt-0.5" style={{ color: 'var(--text)' }}>▸</span>
              <span>{renderInline(line.replace(/^[-*]\s*/, ''))}</span>
            </li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol key={i} className="list-none space-y-1.5 pl-0 counter-reset-[item]">
          {b.text!.split('\n').map((line, j) => (
            <li key={j} className="flex gap-2">
              <span className="font-mono text-[12px] mt-0.5 tabular-nums" style={{ color: 'var(--text)' }}>
                {String(j + 1).padStart(2, '0')}.
              </span>
              <span>{renderInline(line.replace(/^\d+\.\s*/, ''))}</span>
            </li>
          ))}
        </ol>
      );
    case 'code':
      return (
        <pre
          key={i}
          className="border p-3 font-mono text-[12px] overflow-x-auto"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--bg-elev-1)',
            color: 'var(--text)',
          }}
        >
          <div
            className="flex items-center justify-between mb-2 pb-2 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <span
              className="font-mono text-[9px] tracking-[0.2em] uppercase"
              style={{ color: 'var(--text-dim)' }}
            >
              {b.lang || 'code'}
            </span>
          </div>
          <code>{b.text}</code>
        </pre>
      );
    case 'table':
      return <TableBlock key={i} rows={b.rows ?? []} />;
    case 'chart':
      return <ChartRenderer key={i} spec={b.chart!} isStreaming={isStreaming} />;
    default:
      return null;
  }
}

function ChartStreamingPlaceholder() {
  return (
    <div
      className="border p-4 my-3 font-mono text-[11px] tracking-[0.14em] uppercase"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--bg-elev-1)',
        color: 'var(--text-dim)',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2"
          style={{ background: 'var(--accent)', animation: 'pulse 1.2s infinite' }}
        />
        PROCESSING_DATASET · CHART_PENDING
      </div>
    </div>
  );
}

function headingCls(level: number) {
  switch (level) {
    case 1: return 'text-2xl mt-4 mb-2';
    case 2: return 'text-xl mt-3 mb-2';
    case 3: return 'text-base mt-2 mb-1';
    default: return 'text-sm font-semibold mt-2 mb-1';
  }
}

function renderInline(text: string) {
  const parts: Array<{ kind: 'text' | 'code' | 'b' | 'i'; value: string }> = [];
  let remaining = text;
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(remaining)) !== null) {
    if (match.index > last) parts.push({ kind: 'text', value: remaining.slice(last, match.index) });
    const tok = match[0];
    if (tok.startsWith('`')) parts.push({ kind: 'code', value: tok.slice(1, -1) });
    else if (tok.startsWith('**')) parts.push({ kind: 'b', value: tok.slice(2, -2) });
    else parts.push({ kind: 'i', value: tok.slice(1, -1) });
    last = match.index + tok.length;
  }
  if (last < remaining.length) parts.push({ kind: 'text', value: remaining.slice(last) });
  return parts.map((p, i) => {
    if (p.kind === 'code') {
      return (
        <code
          key={i}
          className="font-mono text-[12.5px] border px-1.5 py-0.5"
          style={{
            background: 'var(--code-bg, var(--bg-elev-1))',
            borderColor: 'var(--border)',
            color: 'var(--text)',
          }}
        >
          {p.value}
        </code>
      );
    }
    if (p.kind === 'b') return <strong key={i} className="font-semibold" style={{ color: 'var(--text)' }}>{p.value}</strong>;
    if (p.kind === 'i') return <em key={i} style={{ color: 'var(--text-dim)' }}>{p.value}</em>;
    return <span key={i}>{p.value}</span>;
  });
}

function TableBlock({ rows }: { rows: string[][] }) {
  if (rows.length === 0) return null;
  const [header, ...body] = rows;
  return (
    <div className="border overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
      <table className="omni-table w-full text-[13px]" style={{ color: 'var(--text)' }}>
        <thead>
          <tr>
            {header.map((c, i) => (
              <th
                key={i}
                className="font-mono text-[10px] tracking-[0.14em] uppercase text-left px-3 py-2 border-b"
                style={{
                  background: 'var(--bg-elev-1)',
                  color: 'var(--text-dim)',
                  borderColor: 'var(--border)',
                }}
              >
                {renderInline(c.trim())}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r, i) => (
            <tr key={i} className="transition-colors">
              {r.map((c, j) => (
                <td
                  key={j}
                  className="px-3 py-2 border-b font-mono text-[12px] tabular-nums"
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                  }}
                >
                  {renderInline(c.trim())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Parser ---------- */

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    const fence = line.match(/^```([\w-]+)?\s*$/);
    if (fence) {
      const lang = fence[1] ?? '';
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].match(/^```\s*$/)) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      if (lang === 'json:chart') {
        const spec = safeParseChart(buf.join('\n'));
        if (spec) out.push({ kind: 'chart', chart: spec });
        else out.push({ kind: 'code', lang: 'json', text: buf.join('\n') });
      } else {
        out.push({ kind: 'code', lang: lang === 'json:chart' ? 'json' : lang, text: buf.join('\n') });
      }
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*[-:]+\s*(\|\s*[-:]+\s*)+\|?\s*$/.test(lines[i + 1])) {
      const rows: string[][] = [];
      rows.push(splitRow(line));
      i += 2;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(splitRow(lines[i]));
        i++;
      }
      out.push({ kind: 'table', rows });
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      out.push({ kind: 'h', level: h[1].length, text: h[2] });
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && (/^[-*]\s+/.test(lines[i]) || lines[i] === '')) {
        if (lines[i] !== '') buf.push(lines[i]);
        i++;
      }
      out.push({ kind: 'ul', text: buf.join('\n') });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && (/^\d+\.\s+/.test(lines[i]) || lines[i] === '')) {
        if (lines[i] !== '') buf.push(lines[i]);
        i++;
      }
      out.push({ kind: 'ol', text: buf.join('\n') });
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].match(/^```/) &&
      !(lines[i].includes('|') && i + 1 < lines.length && /^\s*\|?\s*[-:]+\s*(\|\s*[-:]+\s*)+\|?\s*$/.test(lines[i + 1]))
    ) {
      buf.push(lines[i]);
      i++;
    }
    if (buf.length) out.push({ kind: 'p', text: buf.join('\n') });
  }
  return out;
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((c) => c.trim());
}

function safeParseChart(src: string): ChartSpec | null {
  try {
    const obj = JSON.parse(src) as Record<string, unknown>;
    const type = (obj.type as string) ?? 'line';
    if (!['line', 'bar', 'area'].includes(type)) return null;
    const xKey = (obj.xKey as string) ?? '';
    const data = Array.isArray(obj.data) ? (obj.data as Array<Record<string, number | string>>) : [];
    const series = Array.isArray(obj.series) ? (obj.series as Array<{ key: string; label: string }>) : [];
    if (!xKey || data.length === 0 || series.length === 0) return null;
    return {
      type: type as ChartSpec['type'],
      xKey,
      data,
      series,
      height: typeof obj.height === 'number' ? (obj.height as number) : 220,
    };
  } catch {
    return null;
  }
}

/** Pull the FIRST valid chart spec out of an AI message. Used by the
 * Workspace right pane to mirror the chart into the Preview tab. */
export function extractChartSpec(content: string): ChartSpec | null {
  const blocks = parseMarkdown(content);
  for (const b of blocks) {
    if (b.kind === 'chart' && b.chart) return b.chart;
  }
  return null;
}