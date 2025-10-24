import React, { useState, useRef } from 'react'
import { CssBaseline, Container, Box, Button, TextField } from '@mui/material'
import TimelineGraph from './components/TimelineGraph'
import LogEntriesTable from './components/LogEntriesTable'
import { parseFileContent } from './utils/fileParser'

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
    const [logData, setLogData] = useState<Array<{ [key: string]: any }[]>>([])
    const [tableData, setTableData] = useState<Array<{ [key: string]: any }>>([])
    // originalLogData is an array where each element is the array of parsed entries for one uploaded file
    const [originalLogData, setOriginalLogData] = useState<Array<{ [key: string]: any }[]>>([])
    const [selectedEntry, setSelectedEntry] = useState<any | null>(null)
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
        const existingNames = new Set<string>(
            originalLogData.map((fileGroup) => (fileGroup && fileGroup.length > 0 ? fileGroup[0].fileName : '')),
        )

        // Filter incoming files to avoid duplicates (either already uploaded or repeated in the same selection)
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
            // Inform the user which files were skipped due to duplicate names
            // Use a simple alert for now; can be replaced with a Snackbar for better UX
            alert(`Skipped ${skippedNames.length} file(s) with duplicate names:\n${skippedNames.join('\n')}`)
        }

        if (filesToProcess.length === 0) {
            // No new files to process; reset the input so the same selection can be attempted again later
            if (event.target) event.target.value = ''
            return
        }

        // We'll accumulate the newly uploaded files here, then append to existing state
        const newAllLogs: Array<{ [key: string]: any }[]> = []
        const newUnionLogs: Array<{ [key: string]: any }> = []
        let processedCount = 0

        filesToProcess.forEach((file) => {
            console.log(`Reading file: ${file.name}`)
            const reader = new FileReader()
            reader.onload = (e) => {
                console.log(`Finished reading file: ${file.name}`)
                const content = e.target?.result as string
                try {
                    const logs = parseFileContent(content, file.name)
                    console.log(`Parsed ${logs.length} valid log entries from file: ${file.name}`)
                    newAllLogs.push(logs)
                    for (const entry of logs) {
                        newUnionLogs.push(entry)
                    }
                } catch (error) {
                    console.log(`Error processing file: ${file.name}`, error)
                } finally {
                    processedCount += 1
                    // When all selected files are processed, append them to existing state
                    if (processedCount === filesToProcess.length) {
                        console.log('All files processed; appending to existing data')
                        setOriginalLogData((prev) => [...prev, ...newAllLogs])
                        setLogData((prev) => [...prev, ...newAllLogs])
                        setTableData((prev) => [...prev, ...newUnionLogs])
                        setIsLoaded(true)

                        // Reset the input so the same files can be uploaded again if needed
                        if (event.target) event.target.value = ''
                    }
                }
            }
            reader.readAsText(file)
        })
    }

    const handleFilterKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            try {
                const filter = filterInputRef.current?.value || '' // Read the value directly from the ref
                console.log(`Filter applied: ${filter}`)
                const filteredLogData = originalLogData
                    .map((fileData) => fileData.filter((entry) => matchesQuery(filter, JSON.stringify(entry))))
                    .filter((fileData) => fileData.length > 0) // Remove empty file groups

                setTableData(filteredLogData.flat()) // Flatten filteredLogData for table
                setLogData(filteredLogData)
            } catch {
                console.log('Invalid query syntax')
            }
        }
    }

    const handleRemoveFile = (fileName: string) => {
        // Remove any file groups whose first entry's fileName matches the provided fileName
        const newOriginal = originalLogData.filter((fileGroup) => {
            if (!fileGroup || fileGroup.length === 0) return false
            return fileGroup[0].fileName !== fileName
        })

        setOriginalLogData(newOriginal)
        setLogData(newOriginal)
        setTableData(newOriginal.flat())

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
                            sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
                                    {originalLogData.map((fileGroup, idx) => {
                                        const name =
                                            fileGroup && fileGroup.length > 0
                                                ? fileGroup[0].fileName
                                                : `File ${idx + 1}`
                                        return (
                                            <Box
                                                key={`${name}-${idx}`}
                                                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                                            >
                                                <Box sx={{ fontWeight: '500' }}>{name}</Box>
                                                <Button
                                                    variant="outlined"
                                                    color="error"
                                                    size="small"
                                                    onClick={() => handleRemoveFile(name)}
                                                >
                                                    Remove
                                                </Button>
                                            </Box>
                                        )
                                    })}
                                </Box>
                            )}

                            <TextField
                                label="Filter Regex"
                                variant="outlined"
                                fullWidth
                                inputRef={filterInputRef} // Attach the ref to the input field
                                onKeyDown={handleFilterKeyPress}
                                sx={{ my: 2 }}
                            />

                            <Box sx={{ my: 4 }}>
                                <TimelineGraph data={logData} setSelectedEntry={setSelectedEntry} />
                            </Box>

                            <Box sx={{ my: 4 }}>
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
