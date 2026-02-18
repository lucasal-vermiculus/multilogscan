import { get } from 'lodash'
import config from '../../config.json'
import { LogEntry, LogFile } from '../App'

const PREVIEW_MAX_LENGTH = 1000

// Utility function to resolve nested paths
type NestedObject = { [key: string]: any }
const resolveNestedPath = (obj: NestedObject, path: string): any => {
    return get(obj, path)
}

export const parseFileContent = (content: string, fileName: string): LogFile => {
    let logs: LogEntry[]
    try {
        // Check if the content is a JSON array
        const parsedContent = JSON.parse(content)
        if (Array.isArray(parsedContent)) {
            logs = parsedContent
                .map((entry, index) => parseLogEntry(entry, fileName, index))
                .filter((entry) => entry !== null)
        } else {
            console.log(`File ${fileName} is not a JSON array`);
            throw new Error('Not a JSON array')
        }
    } catch {
        // Fallback to line-by-line parsing
        console.log(`Falling back to line-by-line parsing for file ${fileName}`);
        logs = content
            .split('\n')
            .map((line, index) => {
                if (!line.trim()) return null
                try {
                    const parsed = JSON.parse(line)
                    return parseLogEntry(parsed, fileName, index)
                } catch {
                    return null
                }
            })
            .filter((entry) => entry !== null)
    }
    return { fileName, entries: logs }
}

const parseLogEntry = (entry: any, fileName: string, index: number): LogEntry | null => {
    let timestampValue
    for (const field of config.timestampFields) {
        const fieldValue = resolveNestedPath(entry, field)
        if (fieldValue) {
            // Try parsing as UNIX timestamp in milliseconds
            if (!isNaN(Number(fieldValue))) {
                timestampValue = new Date(Number(fieldValue)).toISOString()
                break
            }

            // Try each regex in turn
            for (const regex of config.timestampRegexes) {
                if (new RegExp(regex).test(fieldValue)) {
                    timestampValue = new Date(fieldValue).toISOString()
                    break
                }
            }

            if (timestampValue) break
        }
    }

    if (!timestampValue) {
        console.log(`No timestamp found for entry in file ${fileName} at line ${index + 1}`)
        return null
    }

    const content = { ...entry, timestamp: timestampValue }

    const preview =
        (entry.result?._raw
            ? entry.result?._raw.substring(0, PREVIEW_MAX_LENGTH)
            : JSON.stringify(entry).substring(0, PREVIEW_MAX_LENGTH)) + '...'

    return { content, fileName, timestamp: timestampValue, lineNumber: index + 1, preview }
}
