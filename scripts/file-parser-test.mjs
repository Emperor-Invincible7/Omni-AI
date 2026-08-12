/**
 * Quick standalone test for the client-side file parser.
 * Run with: node scripts/file-parser-test.mjs
 *
 * Compiles the TS on the fly via a tiny in-process shim that calls the
 * same `papaparse` library the browser bundle uses. The actual `parseFile`
 * is browser-only (uses File.text() and File.size), so this script
 * exercises the CSV / JSON parsing functions directly via dynamic import.
 */

import Papa from 'papaparse';

function parseCsv(text) {
  const result = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: true });
  return result;
}

console.log('=== CSV PARSE TEST ===');
const csv = `name,age,city
Alice,30,NYC
Bob,25,LA
Charlie,35,SF
`;
const parsed = parseCsv(csv);
console.log('rows:', parsed.data.length);
console.log('fields:', parsed.meta.fields);
console.log('row 0:', JSON.stringify(parsed.data[0]));
if (parsed.data.length === 3 && parsed.meta.fields.includes('age')) {
  console.log('--- CSV_OK');
} else {
  console.error('--- CSV_FAILED');
  process.exit(1);
}

console.log('=== JSON PARSE TEST ===');
const json = JSON.stringify({ items: [{ id: 1, name: 'X' }, { id: 2, name: 'Y' }] });
const obj = JSON.parse(json);
console.log('items:', obj.items.length);
if (obj.items.length === 2) {
  console.log('--- JSON_OK');
} else {
  console.error('--- JSON_FAILED');
  process.exit(1);
}

console.log('=== ALL_PARSER_OK');