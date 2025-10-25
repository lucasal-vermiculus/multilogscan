import React from 'react'
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { LogFile } from '../App'

interface TimelineGraphProps {
    data: LogFile[]
    setSelectedEntry: (entry: any) => void // Added prop for setting selected entry
}

const TimelineGraph: React.FC<TimelineGraphProps> = ({ data, setSelectedEntry }) => {
    const calculateSamplingRate = (totalEntries: number): number => {
        if (totalEntries > 1000) return Math.ceil(totalEntries / 100) // Sample 1 out of every 100 entries for large datasets
        return 1 // No sampling for smaller datasets
    }

    const processedData = data.map((fileData, fileIndex) => {
        const samplingRate = calculateSamplingRate(fileData.entries.length)
        return fileData.entries
            .filter((_, index) => index % samplingRate === 0) // Sample the data dynamically
            .map((entry) => ({
                x: new Date(entry.timestamp).getTime(),
                y: fileIndex,
                ...entry,
            }))
    })

    const fileNames = processedData.map((fileData, index) =>
        fileData.length > 0 ? fileData[0].fileName : `File ${index + 1}`,
    ) // Ensure only uploaded files are represented

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
                        onClick={(event) => {
                            const clickedEntry = event.payload
                            console.log('Clicked entry:', clickedEntry) // Log the clicked entry
                            if (clickedEntry) {
                                setSelectedEntry(clickedEntry) // Update selected entry state
                            }
                        }}
                    />
                ))}
                <XAxis
                    type="number"
                    dataKey="x"
                    name="Time"
                    domain={['auto', 'auto']}
                    tickFormatter={(tick) => {
                        const date = new Date(tick)
                        return `${date.toISOString().split('T')[0]} ${date.toISOString().split('T')[1].split('Z')[0]}` // Format as YYYY-MM-DD HH:MM:SS
                    }}
                />
                <YAxis
                    type="number"
                    dataKey="y"
                    name="File Index"
                    tickFormatter={(tick) => fileNames[tick] || 'Unknown File'}
                    tickCount={fileNames.length}
                    tick={{ dx: -10 }} // Add padding to the left of the labels
                    domain={['dataMin', 'dataMax']}
                    interval={0}
                />
                <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            const entry = payload[0].payload
                            return (
                                <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '5px' }}>
                                    <p>{`File: ${entry.fileName}`}</p>
                                    <p>{`Timestamp: ${new Date(entry.x).toISOString()}`}</p>
                                    <p>{`Line: ${entry.lineNumber}`}</p>
                                </div>
                            )
                        }
                        return null
                    }}
                />
            </ScatterChart>
        </ResponsiveContainer>
    )
}

export default TimelineGraph
