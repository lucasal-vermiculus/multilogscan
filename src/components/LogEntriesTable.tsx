import React, { useState, useEffect } from 'react'
import { DataGrid, GridColDef, gridFilteredSortedRowEntriesSelector, useGridApiRef } from '@mui/x-data-grid'
import { Button } from '@mui/material'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import JsonDialog from './JsonDialog'

interface LogEntriesTableProps {
    data: Array<{ [key: string]: any }>
    selectedEntry: any | null // Added prop for selected entry
}

const LogEntriesTable: React.FC<LogEntriesTableProps> = ({ data, selectedEntry }) => {
    const [columns, setColumns] = useState<GridColDef[]>([])
    const [selectedRow, setSelectedRow] = useState<any | null>(null)
    const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number } | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const apiRef = useGridApiRef()

    useEffect(() => {
        if (data.length > 0) {
            setColumns([
                { field: 'timestamp', headerName: 'Timestamp', flex: 1 },
                { field: 'fileName', headerName: 'File', flex: 1 },
                { field: 'logLineNumber', headerName: 'Line', flex: 1 },
                { field: 'rawJson', headerName: 'JSON', flex: 2 },
            ])
        }
    }, [data])

    const rows = data.map((row, index) => ({
        id: index,
        timestamp: row.timestamp,
        fileName: row.fileName,
        logLineNumber: row.logLineNumber,
        rawJson: JSON.stringify(row),
    }))

    useEffect(() => {
        if (selectedEntry) {
            const currentRows = gridFilteredSortedRowEntriesSelector(apiRef)
            const rowIndex = rows.findIndex(
                (row) => row.logLineNumber === selectedEntry.logLineNumber && row.fileName === selectedEntry.fileName,
            )
            setSelectedRow(rows[rowIndex])
            const currentRowIndex = currentRows.findIndex(
                (row) =>
                    row.model.logLineNumber === selectedEntry.logLineNumber &&
                    row.model.fileName === selectedEntry.fileName,
            )
            if (rowIndex !== -1) {
                const pageSize = apiRef.current?.state.pagination.paginationModel.pageSize
                apiRef.current?.setPage(Math.floor(currentRowIndex / pageSize)) // Navigate to the correct page
                apiRef.current?.scrollToIndexes({ rowIndex }) // Scroll to the item within the table

                // Scroll the browser window to the table row
                setTimeout(() => {
                    const rowElement = document.querySelector(`[data-id='${rowIndex}']`)
                    if (rowElement) {
                        rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                }, 250) // Delay scrolling by 100ms

                apiRef.current?.selectRow(rowIndex, true, true) // Select the row with the checkbox and uncheck the others
                console.log('Row selected:', rows[rowIndex])
            }
        }
    }, [selectedEntry, data])

    const handleAutosize = () => {
        apiRef.current?.autosizeColumns({})
    }

    const handleContextMenu = (event: React.MouseEvent) => {
        event.preventDefault()
        const rowId = Number(event.currentTarget.getAttribute('data-id'))
        setSelectedRow(rows.find((row) => row.id === rowId))
        console.log(
            'Selected row:',
            rows.find((row) => row.id === rowId),
        )
        setContextMenu(contextMenu === null ? { mouseX: event.clientX - 2, mouseY: event.clientY - 4 } : null)
    }

    const handleCloseDialog = () => {
        setDialogOpen(false)
        setSelectedRow(null)
        console.log('Set selectedRow to null')
    }

    const handleClose = () => {
        setContextMenu(null)
    }

    const openJsonDialog = () => {
        if (selectedRow) {
            setDialogOpen(true)
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div>
                <Button variant="contained" onClick={handleAutosize} style={{ marginBottom: '10px' }}>
                    Autosize Columns
                </Button>
                <Button
                    variant="contained"
                    onClick={openJsonDialog}
                    disabled={!selectedRow} // Enable only when a row is selected
                    style={{ marginBottom: '10px' }}
                >
                    View Selected JSON
                </Button>
            </div>
            <DataGrid
                apiRef={apiRef}
                rows={rows}
                columns={columns}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                pageSizeOptions={[5, 10, 20, 50]}
                checkboxSelection={false}
                onRowClick={(params) => setSelectedRow(params.row)}
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
                    contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
                }
            >
                <MenuItem
                    onClick={() => {
                        setDialogOpen(true)
                        setContextMenu(null)
                    }}
                >
                    View JSON
                </MenuItem>
            </Menu>
            <JsonDialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                json={selectedRow ? JSON.parse(selectedRow.rawJson) : null}
            />
        </div>
    )
}

export default LogEntriesTable
