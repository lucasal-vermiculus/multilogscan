import React, { useState, useRef } from 'react'
import { CssBaseline, Container, Box, Button, TextField } from '@mui/material'
import TimelineGraph from './components/TimelineGraph'
import LogEntriesTable from './components/LogEntriesTable'
import { parseFileContent } from './utils/fileParser'

export interface LogEntry {
    timestamp: string
    lineNumber: number
    content: { [key: string]: any }
    fileName: string
}

export interface LogFile {
    fileName: string
    entries: LogEntry[]
}

// Utility function to match the simpler query language
const matchesQuery = (query: string, text: string): boolean => {
    const parts = query.split('|') // Split by alternation
    return parts.some((part) => {
        const segments = part.split('*') // Split by wildcard
        let lastIndex = 0
        for (const segment of segments) {
            if (segment === '') continue // Skip empty segments (e.g., leading/trailing *)
            const index = text.indexOf(segment, lastIndex)
            if (index === -1) return false // Segment not found
            lastIndex = index + segment.length
        }
        return true
    })
}

function App() {
    // All files currently displayed (after filter)
    const [logData, setLogData] = useState<LogFile[]>([])

    // Flat view of all entries currently displayed (after filter)
    const [tableData, setTableData] = useState<LogEntry[]>([])

    // Ground truth: all uploaded files in full, unfiltered form
    const [originalLogData, setOriginalLogData] = useState<LogFile[]>([])

    // Row currently highlighted/selected in UI
    const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null)

    const [isLoaded, setIsLoaded] = useState(false)
    const filterInputRef = useRef<HTMLInputElement>(null)

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        console.log('File upload triggered')
        const files = event.target.files
        if (!files) {
            console.log('No files selected')
            return
        }

        console.log(`Number of files selected: ${files.length}`)

        // Build a set of already-uploaded filenames
        const existingNames = new Set<string>(originalLogData.map((lf) => lf.fileName))

        // Filter incoming files to avoid duplicates (already uploaded OR repeated in this same selection)
        const seenInSelection = new Set<string>()
        const skippedNames: string[] = []
        const filesToProcess = Array.from(files).filter((file) => {
            if (existingNames.has(file.name)) {
                skippedNames.push(file.name)
                return false
            }
            if (seenInSelection.has(file.name)) {
                skippedNames.push(file.name)
                return false
            }
            seenInSelection.add(file.name)
            return true
        })

        if (skippedNames.length > 0) {
            alert(`Skipped ${skippedNames.length} file(s) with duplicate names:\n${skippedNames.join('\n')}`)
        }

        if (filesToProcess.length === 0) {
            // Reset the input so user can pick same files again later
            if (event.target) event.target.value = ''
            return
        }

        // We'll accumulate results locally, then merge into state once all FileReaders complete
        const newLogFiles: LogFile[] = []
        let processedCount = 0

        filesToProcess.forEach((file) => {
            console.log(`Reading file: ${file.name}`)
            const reader = new FileReader()

            reader.onload = (e) => {
                console.log(`Finished reading file: ${file.name}`)
                const content = e.target?.result as string

                try {
                    // Expect parseFileContent(content, fileName) -> LogEntry[]
                    const parsedEntries = parseFileContent(content, file.name) as LogEntry[]
                    console.log(`Parsed ${parsedEntries.length} valid log entries from file: ${file.name}`)

                    // Build a LogFile object for this upload
                    const logFile: LogFile = {
                        fileName: file.name,
                        entries: parsedEntries,
                    }

                    newLogFiles.push(logFile)
                } catch (error) {
                    console.log(`Error processing file: ${file.name}`, error)
                } finally {
                    processedCount += 1

                    // When all selected files are processed, update state
                    if (processedCount === filesToProcess.length) {
                        console.log('All files processed; appending to existing data')

                        // Append to originalLogData
                        setOriginalLogData((prev) => {
                            const updated = [...prev, ...newLogFiles]

                            // Also update the filtered views to include everything (no filter yet)
                            const newTableData = updated.flatMap((lf) => lf.entries)
                            setTableData(newTableData)
                            setLogData(updated)

                            // Mark that we have data
                            setIsLoaded(updated.length > 0)

                            return updated
                        })

                        // Reset file input
                        if (event.target) event.target.value = ''
                    }
                }
            }

            reader.readAsText(file)
        })
    }

    const handleFilterKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            const filter = filterInputRef.current?.value || ''
            console.log(`Filter applied: ${filter}`)

            // For each file, keep only the entries whose JSON matches the query
            const filteredLogFiles: LogFile[] = originalLogData
                .map((logFile) => {
                    const filteredEntries = logFile.entries.filter((entry) =>
                        matchesQuery(filter, JSON.stringify(entry)),
                    )
                    return {
                        ...logFile,
                        entries: filteredEntries,
                    }
                })
                // Drop files that ended up empty after filtering
                .filter((logFile) => logFile.entries.length > 0)

            // Flatten to feed the table
            const flattenedEntries = filteredLogFiles.flatMap((lf) => lf.entries)

            setLogData(filteredLogFiles)
            setTableData(flattenedEntries)
        }
    }

    const handleRemoveFile = (fileName: string) => {
        // Remove that file from original
        const newOriginal = originalLogData.filter((lf) => lf.fileName !== fileName)

        setOriginalLogData(newOriginal)

        // After removal, no active filter is re-applied here; we just show everything remaining.
        const newTableData = newOriginal.flatMap((lf) => lf.entries)
        setTableData(newTableData)
        setLogData(newOriginal)

        if (newOriginal.length === 0) {
            setIsLoaded(false)
        }
    }

    return (
        <>
            <CssBaseline />
            <Container maxWidth={false} sx={{ width: '100vw', padding: 0 }}>
                <Box sx={{ my: 4, width: '100%' }}>
                    {!isLoaded ? (
                        <Box
                            sx={{
                                minHeight: '80vh',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Button variant="contained" component="label" sx={{ fontSize: '1.05rem', py: 1.5, px: 3 }}>
                                Upload Log Files
                                <input type="file" hidden multiple onChange={handleFileUpload} />
                            </Button>
                        </Box>
                    ) : (
                        <>
                            <Button variant="contained" component="label">
                                Upload Log Files
                                <input type="file" hidden multiple onChange={handleFileUpload} />
                            </Button>

                            {/* Uploaded files list with remove action */}
                            {originalLogData.length > 0 && (
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', my: 2 }}>
                                    {originalLogData.map((logFile, idx) => (
                                        <Box
                                            key={`${logFile.fileName}-${idx}`}
                                            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                                        >
                                            <Box sx={{ fontWeight: 500 }}>{logFile.fileName}</Box>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                size="small"
                                                onClick={() => handleRemoveFile(logFile.fileName)}
                                            >
                                                Remove
                                            </Button>
                                        </Box>
                                    ))}
                                </Box>
                            )}

                            <TextField
                                label="Filter Regex"
                                variant="outlined"
                                fullWidth
                                inputRef={filterInputRef}
                                onKeyDown={handleFilterKeyPress}
                                sx={{ my: 2 }}
                            />

                            <Box sx={{ my: 4 }}>
                                {/* Timeline probably wants data grouped by file.
                                   We're giving it `LogFile[]`. */}
                                <TimelineGraph data={logData} setSelectedEntry={setSelectedEntry} />
                            </Box>

                            <Box sx={{ my: 4 }}>
                                {/* Table wants flattened entries, plus selected entry to highlight */}
                                <LogEntriesTable data={tableData} selectedEntry={selectedEntry} />
                            </Box>
                        </>
                    )}
                </Box>
            </Container>
        </>
    )
}

export default App
