import React, { useState, useEffect, useMemo } from 'react'
import { DataGrid, GridColDef, gridFilteredSortedRowEntriesSelector, useGridApiRef } from '@mui/x-data-grid'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import JsonDialog from './JsonDialog'
import { LogEntry } from '../App'

interface LogEntriesTableProps {
    data: LogEntry[]
    selectedEntry: LogEntry | null
}

const LogEntriesTable: React.FC<LogEntriesTableProps> = ({ data, selectedEntry }) => {
    const [columns, setColumns] = useState<GridColDef<LogEntry>[]>([])
    const [selectedRow, setSelectedRow] = useState<any | null>(null)
    const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number } | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const apiRef = useGridApiRef()

    useEffect(() => {
        if (data.length > 0) {
            setColumns([
                { field: 'timestamp', headerName: 'Timestamp', flex: 1 },
                { field: 'fileName', headerName: 'File', flex: 1 },
                { field: 'lineNumber', headerName: 'Line', flex: 1 },
                {
                    field: 'rawJson',
                    headerName: 'JSON',
                    flex: 2,
                    valueGetter: (_value, row) => JSON.stringify(row.content),
                },
            ])
        }
    }, [data])

    const rows = useMemo(() => {
        console.log(data)
        return data.map((row, index) => ({
            ...row,
            id: index,
        }))
    }, [data])

    // Auto-resize columns whenever rows change
    useEffect(() => {
        const id = setTimeout(() => {
            apiRef.current?.autosizeColumns({})
        }, 0)

        return () => clearTimeout(id)
    }, [rows, apiRef])

    useEffect(() => {
        if (selectedEntry) {
            const currentRows = gridFilteredSortedRowEntriesSelector(apiRef)
            const rowIndex = rows.findIndex(
                (row) => row.lineNumber === selectedEntry.lineNumber && row.fileName === selectedEntry.fileName,
            )
            setSelectedRow(rows[rowIndex])
            const currentRowIndex = currentRows.findIndex(
                (row) =>
                    row.model.lineNumber === selectedEntry.lineNumber && row.model.fileName === selectedEntry.fileName,
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
                }, 500) // Delay scrolling

                apiRef.current?.selectRow(rowIndex, true, true) // Select the row with the checkbox and uncheck the others
            }
        }
    }, [selectedEntry, data])

    const handleContextMenu = (event: React.MouseEvent) => {
        event.preventDefault()
        const rowId = Number(event.currentTarget.getAttribute('data-id'))
        setSelectedRow(rows.find((row) => row.id === rowId))
        setContextMenu(contextMenu === null ? { mouseX: event.clientX - 2, mouseY: event.clientY - 4 } : null)
    }

    const handleCloseDialog = () => {
        setDialogOpen(false)
        setSelectedRow(null)
    }

    const handleClose = () => {
        setContextMenu(null)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <DataGrid
                apiRef={apiRef}
                rows={rows}
                columns={columns}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                pageSizeOptions={[10, 25, 50, 100]}
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
            <JsonDialog open={dialogOpen} onClose={handleCloseDialog} json={selectedRow ? selectedRow.content : null} />
        </div>
    )
}

export default LogEntriesTable
