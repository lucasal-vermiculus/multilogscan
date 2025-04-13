import React from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import config from '../../config.json';
import get from 'lodash/get';

interface TimelineGraphProps {
  data: Array<{ [key: string]: any }[]>;
}

const TimelineGraph: React.FC<TimelineGraphProps> = ({ data }) => {
  const calculateSamplingRate = (totalEntries: number): number => {
    if (totalEntries > 1000) return Math.ceil(totalEntries / 100); // Sample 1 out of every 100 entries for large datasets
    if (totalEntries > 500) return Math.ceil(totalEntries / 50); // Sample 1 out of every 50 entries for medium datasets
    return 1; // No sampling for smaller datasets
  };

  const processedData = data.map((fileData, fileIndex) => {
    const samplingRate = calculateSamplingRate(fileData.length);
    return fileData
      .filter((_, index) => index % samplingRate === 0) // Sample the data dynamically
      .map((entry) => ({
        x: new Date(get(entry, config.timestampField)).getTime(),
        y: fileIndex,
        ...entry,
      }));
  });

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