import React from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface TimelineGraphProps {
  data: Array<{ timestamp: string; [key: string]: any }[]>;
}

const TimelineGraph: React.FC<TimelineGraphProps> = ({ data }) => {
  const processedData = data.map((fileData, fileIndex) =>
    fileData.map((entry) => ({
      x: new Date(entry.timestamp).getTime(),
      y: fileIndex,
      ...entry,
    }))
  );

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart
        margin={{
          top: 20,
          right: 20,
          bottom: 20,
          left: 20,
        }}
      >
        <CartesianGrid />
        {processedData.map((fileData, index) => (
          <Scatter
            key={index}
            data={fileData}
            fill={`hsl(${(index * 360) / data.length}, 70%, 50%)`}
          />
        ))}
        <XAxis
          type="number"
          dataKey="x"
          name="Time"
          domain={['auto', 'auto']}
          tickFormatter={(tick) => new Date(tick).toISOString().split('T')[1].split('Z')[0]} // Format as HH:MM:SS in UTC
        />
        <YAxis type="number" dataKey="y" name="File Index" />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          formatter={(value, name) =>
            name === 'x' ? new Date(value).toISOString() : value
          }
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
};

export default TimelineGraph;