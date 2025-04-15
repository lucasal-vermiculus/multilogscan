import React, { useState, useRef } from 'react';
import { CssBaseline, Container, Box, Button, TextField } from '@mui/material';
import TimelineGraph from './components/TimelineGraph';
import LogEntriesTable from './components/LogEntriesTable';
import { parseFileContent } from './utils/fileParser';

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
  const [originalLogData, setOriginalLogData] = useState<Array<{ [key: string]: any }[]>>([]);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);

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
          const logs = parseFileContent(content, file.name);
          console.log(`Parsed ${logs.length} valid log entries from file: ${file.name}`);
          allLogs.push(logs);
          unionLogs.push(...logs);

          if (allLogs.length === files.length) {
            console.log('All files processed');
            setOriginalLogData(allLogs);
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
        const filter = filterInputRef.current?.value || ''; // Read the value directly from the ref
        console.log(`Filter applied: ${filter}`);
        const filteredLogData = originalLogData
          .map((fileData) => fileData.filter((entry) => matchesQuery(filter, JSON.stringify(entry))))
          .filter((fileData) => fileData.length > 0); // Remove empty file groups

        setTableData(filteredLogData.flat()); // Flatten filteredLogData for table
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
        </Box>
      </Container>
    </>
  );
}

export default App;
