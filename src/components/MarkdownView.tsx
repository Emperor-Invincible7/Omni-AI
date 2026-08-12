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
 * Deliberately avoids a heavy dependency. Pure string → React tree.
 */

interface Block {
  kind: 'p' | 'h' | 'ul' | 'ol' | 'code' | 'table' | 'chart';
  level?: number;
  text?: string;
  lang?: string;
  rows?: string[][];
  chart?: ChartSpec;
}

interface ChartSpec {
  type: 'line' | 'bar' | 'area';
  xKey: string;
  data: Array<Record<string, number | string>>;
  series: Array<{ key: string; label: string }>;
  height?: number;
}

export default function MarkdownView({ content }: { content: string }) {
  const blocks = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div className="omni-md text-[14px] leading-relaxed text-[#EDEDED] space-y-3">
      {blocks.map((b, i) => renderBlock(b, i))}
    </div>
  );
}

function renderBlock(b: Block, i: number) {
  switch (b.kind) {
    case 'h':
      return (
        <h3 key={i} className={`font-bold tracking-tight text-white ${headingCls(b.level ?? 3)}`}>
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
              <span className="text-white font-mono text-[12px] mt-0.5">▸</span>
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
              <span className="text-white font-mono text-[12px] mt-0.5 tabular-nums">
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
          className="border border-white/20 bg-black p-3 font-mono text-[12px] overflow-x-auto text-[#EDEDED]"
        >
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/20">
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-[#A3A3A3]">
              {b.lang || 'code'}
            </span>
          </div>
          <code>{b.text}</code>
        </pre>
      );
    case 'table':
      return <TableBlock key={i} rows={b.rows ?? []} />;
    case 'chart':
      return <ChartRenderer key={i} spec={b.chart!} />;
    default:
      return null;
  }
}

function headingCls(level: number) {
  switch (level) {
    case 1: return 'text-2xl mt-4 mb-2';
    case 2: return 'text-xl mt-3 mb-2';
    case 3: return 'text-base mt-2 mb-1';
    default: return 'text-sm font-semibold text-[#EDEDED] mt-2 mb-1';
  }
}

function renderInline(text: string) {
  // Inline code `x`, **bold**, *italic*
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
        <code key={i} className="font-mono text-[12.5px] bg-black border border-white/20 px-1.5 py-0.5">
          {p.value}
        </code>
      );
    }
    if (p.kind === 'b') return <strong key={i} className="text-white font-semibold">{p.value}</strong>;
    if (p.kind === 'i') return <em key={i} className="text-[#D4D4D4]">{p.value}</em>;
    return <span key={i}>{p.value}</span>;
  });
}

function TableBlock({ rows }: { rows: string[][] }) {
  if (rows.length === 0) return null;
  const [header, ...body] = rows;
  return (
    <div className="border border-white/20 overflow-x-auto">
      <table className="omni-table w-full text-[13px]">
        <thead>
          <tr>
            {header.map((c, i) => (
              <th key={i} className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#A3A3A3] text-left px-3 py-2 border-b border-white/20">
                {renderInline(c.trim())}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r, i) => (
            <tr key={i} className="hover:bg-[#0A0A0A] transition-colors">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 border-b border-white/20 font-mono text-[12px] tabular-nums">
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

function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Fenced code (```lang … ```) or chart fence (```json:chart … ```)
    const fence = line.match(/^```([\w-]+)?\s*$/);
    if (fence) {
      const lang = fence[1] ?? '';
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].match(/^```\s*$/)) {
        buf.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      if (lang === 'json:chart') {
        const spec = safeParseChart(buf.join('\n'));
        if (spec) out.push({ kind: 'chart', chart: spec });
        else out.push({ kind: 'code', lang: 'json', text: buf.join('\n') });
      } else {
        out.push({ kind: 'code', lang: lang === 'json:chart' ? 'json' : lang, text: buf.join('\n') });
      }
      continue;
    }

    // Markdown table ─ at least header line + separator line
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

    // Heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      out.push({ kind: 'h', level: h[1].length, text: h[2] });
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && (/^[-*]\s+/.test(lines[i]) || lines[i] === '')) {
        if (lines[i] !== '') buf.push(lines[i]);
        i++;
      }
      out.push({ kind: 'ul', text: buf.join('\n') });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && (/^\d+\.\s+/.test(lines[i]) || lines[i] === '')) {
        if (lines[i] !== '') buf.push(lines[i]);
        i++;
      }
      out.push({ kind: 'ol', text: buf.join('\n') });
      continue;
    }

    // Blank line → skip
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph (collect until blank line / fence / table)
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