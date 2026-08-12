/**
 * Client-side file parsing.
 *
 * When the user attaches a file via the InputBar's paperclip button, we
 * parse it locally in the browser (no server round-trip) and produce a
 * compact string summary that gets injected into the message context
 * under a [DATA CONTEXT] block.
 *
 * Supported formats:
 *   - .csv  → papaparse (header inference, numeric coercion)
 *   - .json → JSON.parse, normalized to a readable preview
 *   - .txt / .md / other → raw text excerpt
 */

import Papa from 'papaparse';

export interface ParsedFile {
  name: string;
  size: number;
  /** Detected kind — drives how we summarize. */
  kind: 'csv' | 'json' | 'text';
  /** Always set; the model's actual user prompt. */
  summary: string;
  /** Optional row preview for CSVs (small). */
  previewRows?: Array<Record<string, unknown>>;
  /** Optional total row count (capped at MAX_ROWS_TRACKED). */
  totalRows?: number;
  /** Number of columns detected (CSV). */
  columnCount?: number;
}

const MAX_PREVIEW_ROWS = 8;
const MAX_SUMMARY_CHARS = 4_000; // hard cap so we don't blow context window

export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  const text = await file.text();

  if (ext === 'csv' || ext === 'tsv') {
    return parseCsv(file.name, file.size, text, ext === 'tsv' ? '\t' : ',');
  }
  if (ext === 'json') {
    return parseJson(file.name, file.size, text);
  }
  return parseText(file.name, file.size, text);
}

function parseCsv(name: string, size: number, text: string, delimiter: string): ParsedFile {
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter,
    dynamicTyping: true,
  });

  const rows = result.data ?? [];
  const previewRows = rows.slice(0, MAX_PREVIEW_ROWS);
  const columns = (result.meta?.fields ?? []) as string[];
  const totalRows = rows.length;
  const columnCount = columns.length;

  const sample = previewRows
    .map((r) =>
      columns
        .map((c) => `${c}=${formatCell(r[c])}`)
        .join(' | '),
    )
    .join('\n');

  const summary = [
    `[DATA CONTEXT] CSV file: ${name}`,
    `Rows: ${totalRows}${totalRows > MAX_PREVIEW_ROWS ? ` (showing first ${MAX_PREVIEW_ROWS})` : ''}`,
    `Columns: ${columnCount} (${columns.slice(0, 20).join(', ')}${columns.length > 20 ? ', …' : ''})`,
    `Sample rows:`,
    sample,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    name,
    size,
    kind: 'csv',
    summary: truncate(summary, MAX_SUMMARY_CHARS),
    previewRows,
    totalRows,
    columnCount,
  };
}

function parseJson(name: string, size: number, text: string): ParsedFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      name,
      size,
      kind: 'json',
      summary: `[DATA CONTEXT] JSON file: ${name}\n(content is not valid JSON — sending as raw text)\n${truncate(text, MAX_SUMMARY_CHARS)}`,
    };
  }

  let shapeDesc = '';
  let preview = '';
  if (Array.isArray(parsed)) {
    shapeDesc = `Array of ${parsed.length} items`;
    const sample = parsed.slice(0, MAX_PREVIEW_ROWS);
    preview = sample
      .map((item, i) => {
        if (item && typeof item === 'object') {
          const keys = Object.keys(item as Record<string, unknown>).slice(0, 8);
          return `[${i}] { ${keys.join(', ')} }`;
        }
        return `[${i}] ${formatCell(item)}`;
      })
      .join('\n');
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    const keys = Object.keys(obj);
    shapeDesc = `Object with ${keys.length} keys (${keys.slice(0, 20).join(', ')}${keys.length > 20 ? ', …' : ''})`;
    preview = JSON.stringify(obj, null, 2).slice(0, MAX_SUMMARY_CHARS);
  } else {
    shapeDesc = `Scalar value`;
    preview = String(parsed);
  }

  const summary = [
    `[DATA CONTEXT] JSON file: ${name}`,
    shapeDesc,
    `Preview:`,
    truncate(preview, MAX_SUMMARY_CHARS),
  ].join('\n');

  return {
    name,
    size,
    kind: 'json',
    summary,
  };
}

function parseText(name: string, size: number, text: string): ParsedFile {
  const summary = `[DATA CONTEXT] Text file: ${name}\nSize: ${size} bytes\n---\n${truncate(text, MAX_SUMMARY_CHARS)}`;
  return { name, size, kind: 'text', summary };
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '∅';
  if (typeof value === 'number') return Number.isInteger(value) ? value.toString() : value.toFixed(3);
  if (typeof value === 'string') return value.length > 32 ? `${value.slice(0, 29)}…` : value;
  return String(value);
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n…(truncated)`;
}

/**
 * Format bytes for display.
 */
export function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}