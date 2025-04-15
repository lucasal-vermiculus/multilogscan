import React, { useState, useEffect } from 'react';
import { DataGrid, GridColDef, useGridApiRef } from '@mui/x-data-grid';
import { Button } from '@mui/material';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

interface LogEntriesTableProps {
  data: Array<{ [key: string]: any }>;
}

const LogEntriesTable: React.FC<LogEntriesTableProps> = ({ data }) => {
  const [columns, setColumns] = useState<GridColDef[]>([]);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number } | null>(null);
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

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    const rowId = Number(event.currentTarget.getAttribute('data-id'));
    setSelectedRow(rows.find((row) => row.id === rowId));
    setContextMenu(
      contextMenu === null
        ? { mouseX: event.clientX - 2, mouseY: event.clientY - 4 }
        : null
    );
  };

  const handleClose = () => {
    setContextMenu(null);
  };

  return (
    <div style={{ height: 'calc(100vh - 200px)', width: '100%' }}>
      <Button variant="contained" onClick={handleAutosize} style={{ marginBottom: '10px' }}>
        Autosize Columns
      </Button>
      <DataGrid
        apiRef={apiRef}
        rows={rows}
        columns={columns}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        pageSizeOptions={[5, 10, 20, 50]}
        checkboxSelection
        disableRowSelectionOnClick
        slotProps={{
          row: {
            onContextMenu: handleContextMenu,
            style: { cursor: 'context-menu' },
          },
        }}
      />
      <Menu
        open={contextMenu !== null}
        onClose={handleClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem
          onClick={() => {
            if (selectedRow) {
              alert(JSON.stringify(selectedRow, null, 2));
            }
            handleClose();
          }}
        >
          View JSON
        </MenuItem>
      </Menu>
    </div>
  );
};

export default LogEntriesTable;