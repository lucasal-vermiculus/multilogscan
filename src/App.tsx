import React, { useState } from 'react';
import { CssBaseline, Container, Box, Button, TextField } from '@mui/material';
import TimelineGraph from './components/TimelineGraph';
import LogEntriesTable from './components/LogEntriesTable';
import config from '../config.json';

function App() {
  const [logData, setLogData] = useState<Array<{ [key: string]: any }[]>>([]);
  const [tableData, setTableData] = useState<Array<{ [key: string]: any }>>([]);
  const [filterRegex, setFilterRegex] = useState<string>('');
  const [originalLogData, setOriginalLogData] = useState<Array<{ [key: string]: any }[]>>([]);
  const [originalTableData, setOriginalTableData] = useState<Array<{ [key: string]: any }>>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const allLogs: Array<{ [key: string]: any }[]> = [];
    const unionLogs: Array<{ [key: string]: any }> = [];

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const logs = content.split('\n').map((line) => {
          try {
            const parsed = JSON.parse(line);
            const timestampField = config.timestampField;
            const timestampRegex = new RegExp(config.timestampRegex);

            if (timestampField in parsed && timestampRegex.test(parsed[timestampField])) {
              return { ...parsed, fileName: file.name };
            }
            return null;
          } catch {
            return null;
          }
        }).filter(Boolean);

        allLogs.push(logs);
        unionLogs.push(...logs);

        if (allLogs.length === files.length) {
          setOriginalLogData(allLogs);
          setOriginalTableData(unionLogs);
          setLogData(allLogs);
          setTableData(unionLogs);
        }
      };
      reader.readAsText(file);
    });
  };

  const handleFilterKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      try {
        const filter = new RegExp(filterRegex);
        const filteredTableData = originalTableData.filter((entry) => filter.test(JSON.stringify(entry)));
        const filteredLogData = originalLogData.map((fileData) => fileData.filter((entry) => filter.test(JSON.stringify(entry))));

        setTableData(filteredTableData);
        setLogData(filteredLogData);
      } catch {
        // Invalid regex, do nothing
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
            value={filterRegex}
            onChange={(e) => setFilterRegex(e.target.value)}
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
