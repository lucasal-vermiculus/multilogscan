import React, { useState, useCallback } from 'react';
import { CssBaseline, Container, Box, Button, TextField } from '@mui/material';
import TimelineGraph from './components/TimelineGraph';
import LogEntriesTable from './components/LogEntriesTable';
import config from '../config.json';
import get from 'lodash/get';
import { debounce } from 'lodash';

// Utility function to resolve nested paths
type NestedObject = { [key: string]: any };
const resolveNestedPath = (obj: NestedObject, path: string): any => {
  return get(obj, path);
};

// Utility function to match the simpler query language
const matchesQuery = (query: string, text: string): boolean => {
  const parts = query.split('|'); // Split by alternation
  return parts.some((part) => {
    const segments = part.split('*'); // Split by wildcard
    let lastIndex = 0;
    for (const segment of segments) {
      if (segment === '') continue; // Skip empty segments (e.g., leading/trailing *)
      const index = text.indexOf(segment, lastIndex);
      if (index === -1) return false; // Segment not found
      lastIndex = index + segment.length;
    }
    return true;
  });
};

function App() {
  const [logData, setLogData] = useState<Array<{ [key: string]: any }[]>>([]);
  const [tableData, setTableData] = useState<Array<{ [key: string]: any }>>([]);
  const [filterRegex, setFilterRegex] = useState<string>('');
  const [originalLogData, setOriginalLogData] = useState<Array<{ [key: string]: any }[]>>([]);
  const [originalTableData, setOriginalTableData] = useState<Array<{ [key: string]: any }>>([]);

  const debouncedSetFilterRegex = useCallback(
    debounce((value: string) => setFilterRegex(value), 300),
    []
  );

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSetFilterRegex(event.target.value);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File upload triggered');
    const files = event.target.files;
    if (!files) {
      console.log('No files selected');
      return;
    }

    console.log(`Number of files selected: ${files.length}`);
    const allLogs: Array<{ [key: string]: any }[]> = [];
    const unionLogs: Array<{ [key: string]: any }> = [];

    Array.from(files).forEach((file) => {
      console.log(`Reading file: ${file.name}`);
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log(`Finished reading file: ${file.name}`);
        const content = e.target?.result as string;
        try {
          let logs;
          try {
            // Check if the content is a JSON array
            const parsedContent = JSON.parse(content);
            if (Array.isArray(parsedContent)) {
              logs = parsedContent.map((entry, index) => {
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

                if (!timestampValue) {
                  console.log(`Skipping entry ${index + 1} in file ${file.name}: No valid timestamp found`);
                  return null;
                }

                return { ...entry, fileName: file.name, timestamp: timestampValue };
              }).filter(Boolean);
            } else {
              throw new Error('Not a JSON array');
            }
          } catch {
            // Fallback to line-by-line parsing
            logs = content.split('\n').map((line, index) => {
              if (!line.trim()) {
                console.log(`Skipping line ${index + 1} in file ${file.name}: Empty line`);
                return null;
              }
              try {
                const parsed = JSON.parse(line);
                let timestampValue;
                for (const field of config.timestampFields) {
                  const fieldValue = resolveNestedPath(parsed, field);
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

                if (!timestampValue) {
                  console.log(`Skipping line ${index + 1} in file ${file.name}: No valid timestamp found`);
                  return null;
                }

                return { ...parsed, fileName: file.name, timestamp: timestampValue };
              } catch (parseError) {
                console.log(`Error parsing line ${index + 1} in file ${file.name}:`, parseError);
                return null;
              }
            }).filter(Boolean);
          }

          console.log(`Parsed ${logs.length} valid log entries from file: ${file.name}`);
          allLogs.push(logs);
          unionLogs.push(...logs);

          if (allLogs.length === files.length) {
            console.log('All files processed');
            setOriginalLogData(allLogs);
            setOriginalTableData(unionLogs);
            setLogData(allLogs);
            setTableData(unionLogs);
          }
        } catch (error) {
          console.log(`Error processing file: ${file.name}`, error);
        }
      };
      reader.readAsText(file);
    });
  };

  const handleFilterKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      try {
        const filteredTableData = originalTableData.filter((entry) => matchesQuery(filterRegex, JSON.stringify(entry)));
        const filteredLogData = originalLogData.map((fileData) => fileData.filter((entry) => matchesQuery(filterRegex, JSON.stringify(entry))));

        setTableData(filteredTableData);
        setLogData(filteredLogData);
      } catch {
        console.log('Invalid query syntax');
      }
    }
  };

  return (
    <>
      <CssBaseline />
      <Container maxWidth={false} sx={{ width: '100vw', padding: 0 }}>
        <Box sx={{ my: 4, width: '100%' }}>
          <Button variant="contained" component="label">
            Upload Log Files
            <input type="file" hidden multiple onChange={handleFileUpload} />
          </Button>

          <TextField
            label="Filter Regex"
            variant="outlined"
            fullWidth
            onChange={handleFilterChange}
            onKeyPress={handleFilterKeyPress}
            sx={{ my: 2 }}
          />

          <Box sx={{ my: 4 }}>
            <TimelineGraph data={logData} />
          </Box>

          <Box sx={{ my: 4 }}>
            <LogEntriesTable data={tableData} />
          </Box>
        </Box>
      </Container>
    </>
  );
}

export default App;
