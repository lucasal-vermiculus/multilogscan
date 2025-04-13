import React, { useState, useEffect } from 'react';
import { DataGrid, GridColDef, useGridApiRef } from '@mui/x-data-grid';
import { Button } from '@mui/material';
import config from '../../config.json';

interface LogEntriesTableProps {
  data: Array<{ [key: string]: any }>;
}

// Utility function to flatten nested objects
const flattenObject = (obj: any, parentKey = '', result: any = {}) => {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = parentKey ? `${parentKey}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        flattenObject(obj[key], newKey, result);
      } else {
        result[newKey] = obj[key];
      }
    }
  }
  return result;
};

const LogEntriesTable: React.FC<LogEntriesTableProps> = ({ data }) => {
  const [columns, setColumns] = useState<GridColDef[]>([]);
  const apiRef = useGridApiRef();

  useEffect(() => {
    if (data.length > 0) {
      const flattenedData = data.map((row) => flattenObject(row));
      const uniqueKeys = Array.from(new Set(flattenedData.flatMap(Object.keys)));

      setColumns([
        { field: 'timestamp', headerName: 'Timestamp', flex: 1 },
        { field: 'fileName', headerName: 'Log File', flex: 1 },
        ...uniqueKeys
          .filter((key) => key !== config.timestampField && key !== 'fileName' && key !== 'rawJson')
          .map((key) => ({ field: key, headerName: key.charAt(0).toUpperCase() + key.slice(1), flex: 1 })),
        { field: 'rawJson', headerName: 'Raw JSON', flex: 2 },
      ]);
    }
  }, [data]);

  const rows = data.map((row, index) => {
    const flattenedRow = flattenObject(row);
    return {
      id: index,
      ...flattenedRow,
      rawJson: JSON.stringify(row),
    };
  });

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
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        checkboxSelection
        disableRowSelectionOnClick
      />
    </div>
  );
};

export default LogEntriesTable;