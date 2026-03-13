"use client"

import type { Table } from "@tanstack/react-table"
import { DownloadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { exportTableToCSV, exportTableToXLSX } from "@/lib/export"

interface DataTableExportOptionsProps<TData> {
  table: Table<TData>
}

export function DataTableExportOptions<TData>({ table }: DataTableExportOptionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <DownloadIcon className="mr-2 size-3" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuItem onClick={() => exportTableToCSV(table)}>Export to CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportTableToXLSX(table)}>Export to Excel</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
