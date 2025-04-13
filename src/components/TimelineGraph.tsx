import React from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface TimelineGraphProps {
  data: Array<{ [key: string]: any }[]>;
}

const TimelineGraph: React.FC<TimelineGraphProps> = ({ data }) => {
  const calculateSamplingRate = (totalEntries: number): number => {
    if (totalEntries > 1000) return Math.ceil(totalEntries / 100); // Sample 1 out of every 100 entries for large datasets
    return 1; // No sampling for smaller datasets
  };

  const processedData = data.map((fileData, fileIndex) => {
    const samplingRate = calculateSamplingRate(fileData.length);
    return fileData
      .filter((_, index) => index % samplingRate === 0) // Sample the data dynamically
      .map((entry) => ({
        x: new Date(entry.timestamp).getTime(),
        y: fileIndex,
        fileName: entry.fileName, // Include file name for rendering on the y-axis
        ...entry,
      }));
  });

  const fileNames = data.map((fileData) => fileData[0]?.fileName || 'Unknown File'); // Extract file names for y-axis labels

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart
        margin={{
          top: 20,
          right: 20,
          bottom: 20,
          left: 250, // Increased left margin to ensure labels are fully visible
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
        <YAxis
          type="number"
          dataKey="y"
          name="File Index"
          tickFormatter={(tick) => fileNames[tick] || 'Unknown File'}
          tick={{ dx: -10 }} // Add padding to the left of the labels
        />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const entry = payload[0].payload;
              return (
                <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '5px' }}>
                  <p>{`File: ${entry.fileName}`}</p>
                  <p>{`Timestamp: ${new Date(entry.x).toISOString()}`}</p>
                </div>
              );
            }
            return null;
          }}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
};

export default TimelineGraph;