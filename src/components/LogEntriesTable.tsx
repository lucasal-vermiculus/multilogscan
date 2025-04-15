import React, { useState, useEffect } from 'react';
import { DataGrid, GridColDef, useGridApiRef } from '@mui/x-data-grid';
import { Button } from '@mui/material';

interface LogEntriesTableProps {
  data: Array<{ [key: string]: any }>;
}

const LogEntriesTable: React.FC<LogEntriesTableProps> = ({ data }) => {
  const [columns, setColumns] = useState<GridColDef[]>([]);
  const apiRef = useGridApiRef();

  useEffect(() => {
    if (data.length > 0) {
      setColumns([
        { field: 'timestamp', headerName: 'Timestamp', flex: 1 },
        { field: 'fileName', headerName: 'File', flex: 1 },
        { field: 'logLineNumber', headerName: 'Line', flex: 1 },
        { field: 'rawJson', headerName: 'JSON', flex: 2 },
      ]);
    }
  }, [data]);

  const rows = data.map((row, index) => ({
    id: index,
    timestamp: row.timestamp,
    fileName: row.fileName,
    logLineNumber: row.logLineNumber,
    rawJson: JSON.stringify(row),
  }));

  const handleAutosize = () => {
    apiRef.current?.autosizeColumns({});
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div>
        <Button variant="contained" onClick={handleAutosize} style={{ marginBottom: '10px' }}>
          Autosize Columns
        </Button>
      </div>
      <DataGrid
        apiRef={apiRef}
        rows={rows}
        columns={columns}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        pageSizeOptions={[10, 25, 50, 100]}
        checkboxSelection
        disableRowSelectionOnClick
      />
    </div>
  );
};

export default LogEntriesTable;