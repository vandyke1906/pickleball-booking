import { useRef, useMemo } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { flexRender, type Table as TanstackTable, type Column } from "@tanstack/react-table"
import type * as React from "react"

import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getCommonPinningStyles } from "@/lib/data-table.v3"
import { cn } from "@/lib/utils"
import { DataTableColumnHeader, getColumnWidth } from "./data-table-column-header"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

// Helper to determine if a cell is pinned and add appropriate border classes
const getPinnedClasses = <TData,>(column: Column<TData>, isHeader = false) => {
  const isPinned = column.getIsPinned()
  if (!isPinned) return ""

  // Add border-l or border-r based on pinning side
  // Also add background because sticky elements are transparent by default
  const side =
    isPinned === "left"
      ? "shadow-[inset_-1px_0_0_0_hsl(var(--border))]"
      : "shadow-[inset_1px_0_0_0_hsl(var(--border))]"
  return cn("sticky z-10", isHeader ? "bg-secondary" : "bg-background", side, isHeader && "z-20")
}

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
  table: TanstackTable<TData>
  actionBar?: React.ReactNode
  isLoading?: boolean
  skeletonRows?: number
  height?: string | number
  totalCount?: number
  dynamicFilterOptions?: Record<
    string,
    Array<{
      value: string
      label: string
      count?: number
      icon?: React.FC<React.SVGProps<SVGSVGElement>>
    }>
  >
}

export function DataTable<TData>({
  table,
  actionBar,
  children,
  className,
  isLoading,
  skeletonRows = 10,
  height = 500,
  totalCount,
  dynamicFilterOptions,
  ...props
}: DataTableProps<TData>) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const { rows } = table.getRowModel()
  const columnsWithOptions = useMemo(() => {
    return table.getAllColumns().map((column) => {
      const id = column.id as string
      const dynamicOptions = dynamicFilterOptions?.[id]
      if (dynamicOptions) {
        column.columnDef.meta = {
          ...column.columnDef.meta,
          options: dynamicOptions,
        }
      }
      return column
    })
  }, [table, dynamicFilterOptions])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 40, // Height of a single row
    overscan: 10,
  })

  const virtualRows = virtualizer.getVirtualItems()
  const totalHeight = virtualizer.getTotalSize()
  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0
  const paddingBottom =
    virtualRows.length > 0 ? totalHeight - (virtualRows[virtualRows.length - 1]?.end ?? 0) : 0

  return (
    <div className={cn("flex w-full flex-col gap-2.5 ", className)} {...props}>
      {children}
      <ScrollArea
        className="overflow-auto relative rounded-md border"
        style={{ height }}
        viewportRef={scrollRef}
      >
        <Table className="relative w-full border-collapse table-auto overflow-x-visible">
          <TableHeader className="sticky top-0 left-0 z-20 [&_tr]:border-b-0">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="shadow-[0_1px_0_0_hsl(var(--border))]">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(
                      " border-r last:border-r-0",
                      "after:pointer-events-none after:absolute after:bottom-0  after:left-0 after:right-0 after:bg-border after:h-px",
                      getPinnedClasses(header.column, true),
                    )}
                    style={{
                      ...getCommonPinningStyles({ column: header.column }),
                    }}
                  >
                    {header.isPlaceholder ? null : typeof header.column.columnDef.header ===
                      "function" ? (
                      <div className="p-2">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </div>
                    ) : (
                      <DataTableColumnHeader header={header} table={table} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          {/* BODY */}
          {isLoading ? (
            <TableBody>
              {Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRow key={i}>
                  {table.getAllColumns().map((col) => (
                    <TableCell
                      key={col.id}
                      data-column-id={col.id}
                      className={cn("px-2 border-r last:border-r-0", getPinnedClasses(col))}
                      style={{
                        ...getCommonPinningStyles({ column: col }),
                        width: getColumnWidth(col, rows),
                      }}
                    >
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          ) : (
            <TableBody>
              {rows.length > 0 ? (
                <>
                  {paddingTop > 0 && (
                    <TableRow>
                      <TableCell style={{ height: `${paddingTop}px` }} />
                    </TableRow>
                  )}
                  {virtualRows.map((virtualRow: any) => {
                    const row = rows[virtualRow.index]
                    return (
                      <TableRow
                        key={row.id}
                        data-index={virtualRow.index}
                        ref={virtualizer.measureElement}
                        data-state={row.getIsSelected() && "selected"}
                      >
                        {row.getVisibleCells().map((cell) => {
                          const isLongText =
                            cell.column.columnDef.meta?.cell?.variant === "long-text"
                          const enableTooltip = cell.column.columnDef.meta?.enableTooltip

                          return (
                            <TableCell
                              key={cell.id}
                              data-column-id={cell.column.id}
                              className={cn(
                                "px-4 border-r last:border-r-0 align-top",
                                getPinnedClasses(cell.column),
                                cell.column.id === "actions" && "whitespace-nowrap",
                              )}
                              style={{
                                ...getCommonPinningStyles({ column: cell.column }),
                                width:
                                  cell.column.id === "actions"
                                    ? "1%"
                                    : getColumnWidth(cell.column, rows),
                                minWidth: cell.column.id === "actions" ? "fit-content" : "20px",
                              }}
                            >
                              {enableTooltip ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={cn(
                                        isLongText ? "whitespace-normal text-wrap" : "text-wrap",
                                      )}
                                    >
                                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="max-w-prose text-wrap text-sm"
                                  >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <div
                                  className={cn(
                                    isLongText ? "whitespace-normal text-wrap" : "text-wrap",
                                  )}
                                >
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </div>
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    )
                  })}
                  {paddingBottom > 0 && (
                    <TableRow>
                      <TableCell style={{ height: `${paddingBottom}px` }} />
                    </TableRow>
                  )}
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          )}
        </Table>

        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <div className="flex flex-col gap-2.5">
        <DataTablePagination table={table} totalCount={totalCount} />
        {actionBar && table.getFilteredSelectedRowModel().rows.length > 0 && actionBar}
      </div>
    </div>
  )
}
