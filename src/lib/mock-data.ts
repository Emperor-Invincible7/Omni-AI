export type Role = 'user' | 'assistant';

export interface Source {
  id: string;
  title: string;
  url: string;
  badge: string;
  accent: 'cyan' | 'emerald' | 'indigo' | 'amber';
}

export interface ChatMessage {
  id: string;
  role: Role;
  content?: string;
  codeBlock?: {
    language: string;
    filename: string;
    code: string;
  };
  timestamp: string;
  model?: string;
  latency?: string;
  badge?: string;
  meta?: string;
  sources?: Source[];
}

export interface ChatGroup {
  label: string;
  count: number;
  items: { id: string; title: string; meta: string }[];
}

export const mockChatGroups: ChatGroup[] = [
  {
    label: 'Today',
    count: 3,
    items: [
      { id: 't1', title: 'Refactoring React performance bottlenecks', meta: '14 messages · 2h ago' },
      { id: 't2', title: 'Rust async runtime deep dive', meta: '8 messages · 5h ago' },
      { id: 't3', title: 'Designing a typography system', meta: '22 messages · 7h ago' },
    ],
  },
  {
    label: 'Yesterday',
    count: 5,
    items: [
      { id: 'y1', title: 'Q3 product roadmap analysis', meta: '31 messages · 1d' },
      { id: 'y2', title: 'Marketing copy variations', meta: '12 messages · 1d' },
    ],
  },
  {
    label: 'Last 7 days',
    count: 12,
    items: [
      { id: 'w1', title: 'SQL query optimization strategies', meta: '19 messages · 3d' },
      { id: 'w2', title: 'Tailwind design tokens explanation', meta: '6 messages · 4d' },
      { id: 'w3', title: 'Implementing OAuth2 in Node.js', meta: '27 messages · 5d' },
      { id: 'w4', title: 'Customer persona research', meta: '9 messages · 6d' },
    ],
  },
];

export const mockMessages: ChatMessage[] = [
  {
    id: 'm1',
    role: 'user',
    content: 'Can you help me refactor this React component? It\'s re-rendering too often and the typing in the search input feels laggy when the list is long.',
    timestamp: '2:14 PM',
  },
  {
    id: 'm2',
    role: 'assistant',
    timestamp: '2:14 PM',
    model: 'Opus 5',
    latency: '2.3s',
    badge: 'Reasoning',
    content: `Absolutely. The lag you're describing is almost always a sign that **state updates are triggering re-renders down a large subtree**. Here are the three highest-impact fixes, ordered by ROI:

1. **Memoize the list items** with \`React.memo\` and a custom comparator on the row props.
2. **Stabilize the handler** with \`useCallback\` and lift only the query string into context.
3. **Virtualize the list** if you have more than ~200 rows. \`@tanstack/virtual\` is the modern choice.

Here's a drop-in refactor demonstrating all three:`,
    codeBlock: {
      language: 'typescript',
      filename: 'SearchList.tsx',
      code: `import { memo, useCallback, useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

type Item = { id: string; label: string };

// Row memoized with shallow prop compare
const Row = memo(function Row({ item, onPick }: {
  item: Item; onPick: (id: string) => void;
}) {
  return (
    <button onClick={() => onPick(item.id)} className="row">
      {item.label}
    </button>
  );
}, (a, b) => a.item.id === b.item.id && a.onPick === b.onPick);

export function SearchList({ items }: { items: Item[] }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(
    () => items.filter(i => i.label.includes(q)),
    [items, q]
  );
  const onPick = useCallback((id: string) => {
    console.log('picked', id);
  }, []);

  return (
    <div>
      <input value={q} onChange={e => setQ(e.target.value)} />
      {filtered.map(item => <Row key={item.id} item={item} onPick={onPick} />)}
    </div>
  );
}`,
    },
    meta: '12 sources · 3.4k tokens',
    sources: [
      { id: 's1', title: 'React docs · Optimizing performance', url: 'react.dev/reference/react/memo', badge: 'R', accent: 'cyan' },
      { id: 's2', title: 'TanStack Virtual docs', url: 'tanstack.com/virtual/latest', badge: 'T', accent: 'emerald' },
    ],
  },
  {
    id: 'm3',
    role: 'user',
    content: 'Perfect. Now show me how to integrate that with the URL search params so deep links work.',
    timestamp: '2:16 PM',
  },
];

export const liveMetrics = [
  { label: 'Latency', value: '247', unit: 'ms', delta: '↓ 12% vs avg', deltaColor: 'emerald' as const },
  { label: 'TPS', value: '89.4', unit: 't/s', delta: '↑ peak', deltaColor: 'cyan' as const },
  { label: 'Tokens', value: '3.4k', unit: '/ 200k', delta: 'this turn', deltaColor: 'mute' as const },
  { label: 'Cost', value: '$0.04', unit: '', delta: '$2.31 total', deltaColor: 'mute' as const },
];

export const contextBreakdown = [
  { color: 'bg-emerald-400', label: 'System prompt', tokens: '1.2k' },
  { color: 'bg-cyan-400', label: 'Conversation', tokens: '28.4k' },
  { color: 'bg-indigo-400', label: 'Knowledge base', tokens: '12.8k' },
  { color: 'bg-amber-400', label: 'Tool outputs', tokens: '4.8k' },
];

export const loadedContext = [
  { label: 'react-performance.md', color: 'bg-cyan-400/10 border-cyan-400/25 text-cyan-200' },
  { label: 'tanstack-virtual', color: 'bg-emerald-400/10 border-emerald-400/25 text-emerald-200' },
  { label: 'design-tokens.json', color: 'bg-indigo-400/10 border-indigo-400/25 text-indigo-200' },
  { label: '2 URLs', color: 'bg-amber-400/10 border-amber-400/25 text-amber-200' },
];

export const sessionTags = [
  { color: 'bg-emerald-400', label: 'React', count: '12 msgs' },
  { color: 'bg-cyan-400', label: 'Performance', count: '8 msgs' },
  { color: 'bg-indigo-400', label: 'TypeScript', count: '5 msgs' },
  { color: 'bg-amber-400', label: 'Refactor', count: '3 msgs' },
];