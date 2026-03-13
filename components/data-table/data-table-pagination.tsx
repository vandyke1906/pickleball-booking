import type { Table } from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Input } from "@/components/ui/input"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface DataTablePaginationProps<TData> extends React.ComponentProps<"div"> {
  table: Table<TData>
  pageSizeOptions?: number[]
}

import { useState } from "react"

// ...

export function DataTablePagination<TData>({ table, pageSizeOptions = [10, 20, 30, 40, 50], className, ...props }: DataTablePaginationProps<TData>) {
  const [pageInput, setPageInput] = useState(table.getState().pagination.pageIndex + 1)

  const pageIndex = table.getState().pagination.pageIndex
  const [lastPageIndex, setLastPageIndex] = useState(pageIndex)

  // Sync pageInput with pageIndex when pageIndex changes externally
  if (pageIndex !== lastPageIndex) {
    setLastPageIndex(pageIndex)
    setPageInput(pageIndex + 1)
  }

  const pageCount =
    table.getPageCount() === -1 ? Math.ceil(table.getFilteredRowModel().rows.length / table.getState().pagination.pageSize) : table.getPageCount()

  return (
    <div className={cn("flex w-full flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8", className)} {...props}>
      <div className="flex-1 whitespace-nowrap text-muted-foreground text-sm">
        {/* {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected. */}
        <span className="whitespace-nowrap font-medium text-sm">
          Records: <span className="font-bold">{table.getFilteredRowModel().rows.length}</span>
        </span>
      </div>
      <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
        {/* ... Rows per page selector ... */}
        <div className="flex items-center space-x-2">
          <p className="whitespace-nowrap font-medium text-sm">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={value => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger className="h-8 w-18 data-size:h-8">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map(pageSize => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-center font-medium text-sm">
          Page
          <Input
            className="mx-2 h-8 w-16"
            min={1}
            max={pageCount}
            type="number"
            value={pageInput}
            onChange={e => setPageInput(Number(e.target.value))}
            onKeyDown={e => {
              if (e.key === "Enter") {
                const page = pageInput ? pageInput - 1 : 0
                table.setPageIndex(page)
              }
            }}
          />
          of {pageCount}
          <Button
            variant="outline"
            size="sm"
            className="ml-2 h-8"
            onClick={() => {
              const page = pageInput ? pageInput - 1 : 0
              table.setPageIndex(page)
            }}
          >
            Go
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            aria-label="Go to first page"
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft />
          </Button>
          <Button
            aria-label="Go to previous page"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft />
          </Button>
          <Button
            aria-label="Go to next page"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight />
          </Button>
          <Button
            aria-label="Go to last page"
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
