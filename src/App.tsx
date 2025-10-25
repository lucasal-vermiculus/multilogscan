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

// Utility function to match a simple query language
const matchesQuery = (include: string, exclude: string, text: string): boolean => {
    // Helper to check if text matches a pattern with | and * wildcards
    const matchesPattern = (pattern: string, text: string): boolean => {
        if (!pattern.trim()) return false
        const parts = pattern.split('|') // Split by alternation
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

    // If there's an exclude match, fail immediately
    if (exclude && matchesPattern(exclude, text)) return false

    // If include is empty, everything not excluded should pass
    if (!include.trim()) return true

    return matchesPattern(include, text)
}

function App() {
    // Ground truth: all uploaded files in full, unfiltered form
    const [originalLogData, setOriginalLogData] = useState<LogFile[]>([])

    // Indices into originalLogData that match current filter
    const [filteredIndices, setFilteredIndices] = useState<null | number[][]>(null)

    // Row currently highlighted/selected in UI
    const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null)

    const [isLoaded, setIsLoaded] = useState(false)
    const includeInputRef = useRef<HTMLInputElement>(null)
    const excludeInputRef = useRef<HTMLInputElement>(null)

    // A function that computes the a filtered view of originalLogData based on the filtered indices
    const getFilteredLogData = (): LogFile[] => {
        if (filteredIndices === null) {
            return originalLogData
        }

        return originalLogData.map((logFile, fileIndex) => {
            const filteredEntries = logFile.entries.filter((_, entryIndex) =>
                filteredIndices[fileIndex]?.includes(entryIndex),
            )
            return { ...logFile, entries: filteredEntries }
        })
    }

    // A function that computes the flattened view of originalLogData based on the filtered indices
    const getFlatTableData = (): LogEntry[] => {
        const filteredLogData = getFilteredLogData()
        return filteredLogData.flatMap((logFile) => logFile.entries)
    }

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
                    const logFile = parseFileContent(content, file.name)
                    console.log(`Parsed ${logFile.entries.length} valid log entries from file: ${file.name}`)

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
            const includeFilter = includeInputRef.current?.value || ''
            const excludeFilter = excludeInputRef.current?.value || ''

            console.log(`Applying filters - Include: "${includeFilter}", Exclude: "${excludeFilter}"`)

            if (includeFilter.trim() === '' && excludeFilter.trim() === '') {
                setFilteredIndices(null)
                return
            }

            // Create a two-dimensional array of filtered indices into originalLogData
            // that matches the current filter
            const newFilteredIndices: number[][] = originalLogData.map((logFile) => {
                const indices: number[] = []
                logFile.entries.forEach((entry, index) => {
                    if (matchesQuery(includeFilter, excludeFilter, JSON.stringify(entry))) {
                        indices.push(index)
                    }
                })
                return indices
            })
            setFilteredIndices(newFilteredIndices)
        }
    }

    const handleRemoveFile = (fileName: string) => {
        // Remove that file from original
        const newOriginal = originalLogData.filter((lf) => lf.fileName !== fileName)

        setOriginalLogData(newOriginal)

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
                                label="Include"
                                variant="outlined"
                                fullWidth
                                inputRef={includeInputRef}
                                onKeyDown={handleFilterKeyPress}
                                sx={{ my: 2 }}
                            />

                            <TextField
                                label="Exclude"
                                variant="outlined"
                                fullWidth
                                inputRef={excludeInputRef}
                                onKeyDown={handleFilterKeyPress}
                                sx={{ my: 2 }}
                            />

                            <Box sx={{ my: 4 }}>
                                <TimelineGraph data={getFilteredLogData()} setSelectedEntry={setSelectedEntry} />
                            </Box>

                            <Box sx={{ my: 4 }}>
                                <LogEntriesTable data={getFlatTableData()} selectedEntry={selectedEntry} />
                            </Box>
                        </>
                    )}
                </Box>
            </Container>
        </>
    )
}

export default App
