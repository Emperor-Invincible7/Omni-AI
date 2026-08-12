// components/ChartRenderer.tsx
import React, { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useParsedData } from '../hooks/useParsedData';

const ChartRenderer = memo(({ jsonString, isStreaming }: { jsonString: string, isStreaming: boolean }) => {
  const data = useParsedData(jsonString, isStreaming);

  if (isStreaming) return <div className="animate-pulse">Synthesizing visualization...</div>;
  if (!data) return null;

  const chartData = Array.isArray(data) ? data : (data.data || []);

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <XAxis dataKey={Object.keys(chartData[0] || {})[0]} />
          <YAxis />
          <Tooltip />
          <Bar dataKey={Object.keys(chartData[0] || {})[1]} fill="#FF4500" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

ChartRenderer.displayName = 'ChartRenderer';
export default ChartRenderer;