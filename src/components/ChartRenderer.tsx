'use client';

import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

interface ChartSpec {
  type: 'line' | 'bar' | 'area';
  xKey: string;
  data: Array<Record<string, number | string>>;
  series: Array<{ key: string; label: string }>;
  height?: number;
}

const MONO_GRID = '#1F1F1F';
const MONO_AXIS = '#525252';
const MONO_TICK = '#A3A3A3';
const MONO_SERIES = ['#FFFFFF', '#D4D4D4', '#A3A3A3', '#737373'];

export default function ChartRenderer({ spec }: { spec: ChartSpec }) {
  const height = spec.height ?? 220;
  return (
    <div className="border border-white/20 bg-black p-3">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/20">
        <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-[#A3A3A3]">
          CHART :: {spec.type.toUpperCase()} · {spec.data.length} PTS · {spec.series.length} SERIES
        </span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        {renderChart(spec)}
      </ResponsiveContainer>
      {/* Legend (mono caps) */}
      <div className="mt-2 flex flex-wrap gap-3">
        {spec.series.map((s, i) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 font-mono text-[9px] tracking-[0.18em] uppercase text-[#A3A3A3]">
            <span className="w-2 h-2" style={{ background: MONO_SERIES[i % MONO_SERIES.length] }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function renderChart(spec: ChartSpec) {
  const common = {
    data: spec.data,
    margin: { top: 8, right: 8, bottom: 0, left: 0 },
  };
  switch (spec.type) {
    case 'bar':
      return (
        <BarChart {...common}>
          <CartesianGrid stroke={MONO_GRID} strokeDasharray="2 2" vertical={false} />
          <XAxis
            dataKey={spec.xKey}
            tick={{ fill: MONO_TICK, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            stroke={MONO_AXIS}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: MONO_TICK, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            stroke={MONO_AXIS}
            tickLine={false}
            axisLine={{ stroke: MONO_AXIS }}
          />
          <Tooltip content={<MonoTooltip />} cursor={{ fill: '#0A0A0A' }} />
          <Legend wrapperStyle={{ display: 'none' }} />
          {spec.series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              fill={MONO_SERIES[i % MONO_SERIES.length]}
              stroke={MONO_SERIES[i % MONO_SERIES.length]}
            />
          ))}
        </BarChart>
      );
    case 'area':
      return (
        <AreaChart {...common}>
          <CartesianGrid stroke={MONO_GRID} strokeDasharray="2 2" vertical={false} />
          <XAxis
            dataKey={spec.xKey}
            tick={{ fill: MONO_TICK, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            stroke={MONO_AXIS}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: MONO_TICK, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            stroke={MONO_AXIS}
            tickLine={false}
            axisLine={{ stroke: MONO_AXIS }}
          />
          <Tooltip content={<MonoTooltip />} cursor={{ stroke: '#FFFFFF', strokeWidth: 1 }} />
          <Legend wrapperStyle={{ display: 'none' }} />
          {spec.series.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={MONO_SERIES[i % MONO_SERIES.length]}
              fill={MONO_SERIES[i % MONO_SERIES.length]}
              fillOpacity={0.18}
              strokeWidth={1.5}
            />
          ))}
        </AreaChart>
      );
    case 'line':
    default:
      return (
        <LineChart {...common}>
          <CartesianGrid stroke={MONO_GRID} strokeDasharray="2 2" vertical={false} />
          <XAxis
            dataKey={spec.xKey}
            tick={{ fill: MONO_TICK, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            stroke={MONO_AXIS}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: MONO_TICK, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            stroke={MONO_AXIS}
            tickLine={false}
            axisLine={{ stroke: MONO_AXIS }}
          />
          <Tooltip content={<MonoTooltip />} cursor={{ stroke: '#FFFFFF', strokeWidth: 1 }} />
          <Legend wrapperStyle={{ display: 'none' }} />
          {spec.series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={MONO_SERIES[i % MONO_SERIES.length]}
              strokeWidth={1.5}
              dot={{ r: 2, fill: MONO_SERIES[i % MONO_SERIES.length], stroke: MONO_SERIES[i % MONO_SERIES.length] }}
              activeDot={{ r: 4, fill: '#FFFFFF' }}
            />
          ))}
        </LineChart>
      );
  }
}

interface MonoTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number | string; name: string; color: string }>;
  label?: string | number;
}

function MonoTooltip({ active, payload, label }: MonoTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black border border-white p-2 font-mono text-[10px] tracking-[0.06em] text-white">
      <div className="text-[#A3A3A3] mb-1 uppercase">{String(label)}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2" style={{ background: p.color }} />
          <span className="text-white">{p.name}</span>
          <span className="text-[#A3A3A3] tabular-nums">{String(p.value)}</span>
        </div>
      ))}
    </div>
  );
}