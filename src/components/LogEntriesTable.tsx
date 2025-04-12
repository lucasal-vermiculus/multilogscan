import React, { useState, useEffect } from 'react';
import { DataGrid, GridColDef, useGridApiRef } from '@mui/x-data-grid';
import { Button } from '@mui/material';

interface LogEntriesTableProps {
  data: Array<{ [key: string]: any }>;
}

const config = {
  timestampField: 'timestamp',
};

const LogEntriesTable: React.FC<LogEntriesTableProps> = ({ data }) => {
  const [columns, setColumns] = useState<GridColDef[]>([]);
  const apiRef = useGridApiRef();

  useEffect(() => {
    if (data.length > 0) {
      setColumns([
        { field: config.timestampField, headerName: 'Timestamp', flex: 1 },
        { field: 'fileName', headerName: 'Log File', flex: 1 },
        ...Object.keys(data[0])
          .filter((key) => key !== config.timestampField && key !== 'fileName' && key !== 'rawJson')
          .map((key) => ({ field: key, headerName: key.charAt(0).toUpperCase() + key.slice(1), flex: 1 })),
        { field: 'rawJson', headerName: 'Raw JSON', flex: 2 },
      ]);
    }
  }, [data]);

  const rows = data.map((row, index) => ({
    id: index,
    ...row,
    rawJson: JSON.stringify(row),
  }));

  const handleAutosize = () => {
    apiRef.current?.autosizeColumns({});
  };

  return (
    <div style={{ height: 400, width: '100%' }}>
      <Button variant="contained" onClick={handleAutosize} style={{ marginBottom: '10px' }}>
        Autosize Columns
      </Button>
      <DataGrid
        apiRef={apiRef}
        rows={rows}
        columns={columns}
        pageSize={10}
        checkboxSelection
        disableSelectionOnClick
      />
    </div>
  );
};

export default LogEntriesTable;