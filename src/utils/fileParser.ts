import { get } from 'lodash';
import config from '../../config.json';

// Utility function to resolve nested paths
type NestedObject = { [key: string]: any };
const resolveNestedPath = (obj: NestedObject, path: string): any => {
  return get(obj, path);
};

export const parseFileContent = (content: string, fileName: string): Array<{ [key: string]: any }> => {
  let logs;
  try {
    // Check if the content is a JSON array
    const parsedContent = JSON.parse(content);
    if (Array.isArray(parsedContent)) {
      logs = parsedContent.map((entry, index) => parseLogEntry(entry, fileName, index)).filter((entry) => entry !== null);
    } else {
      throw new Error('Not a JSON array');
    }
  } catch {
    // Fallback to line-by-line parsing
    logs = content.split('\n').map((line, index) => {
      if (!line.trim()) return null;
      try {
        const parsed = JSON.parse(line);
        return parseLogEntry(parsed, fileName, index);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }
  return logs;
};

const parseLogEntry = (entry: any, fileName: string, index: number): any => {
  let timestampValue;
  for (const field of config.timestampFields) {
    const fieldValue = resolveNestedPath(entry, field);
    if (fieldValue) {
      // Try parsing as UNIX timestamp in milliseconds
      if (!isNaN(Number(fieldValue))) {
        timestampValue = new Date(Number(fieldValue)).toISOString();
        break;
      }

      // Try each regex in turn
      for (const regex of config.timestampRegexes) {
        if (new RegExp(regex).test(fieldValue)) {
          timestampValue = new Date(fieldValue).toISOString();
          break;
        }
      }

      if (timestampValue) break;
    }
  }

  if (!timestampValue) return null;

  return { ...entry, fileName, timestamp: timestampValue, logLineNumber: index + 1 };
};