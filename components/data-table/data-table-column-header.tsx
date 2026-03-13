"use client"

import * as React from "react"
import { useQueryState } from "nuqs"
import { getFiltersStateParser } from "@/lib/parsers"
import { DataTableFilterInput } from "@/components/data-table/data-table-filter-input"
import { v4 as uuidv4 } from "uuid"
import type { ExtendedColumnFilter } from "@/lib/data-table/data-table.v3"
import type { ColumnSort, Header, SortDirection, SortingState, Table } from "@tanstack/react-table"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronsUpDownIcon,
  EyeOffIcon,
  PinIcon,
  PinOffIcon,
  XIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getDefaultFilterOperator, getColumnVariant } from "@/lib/data-table.v3"
import { cn } from "@/lib/utils"
import { Column } from "@tanstack/react-table"

interface DataTableColumnHeaderProps<TData, TValue> extends React.ComponentProps<
  typeof DropdownMenuTrigger
> {
  header: Header<TData, TValue>
  table: Table<TData>
}

export function getColumnWidth<TData>(col: Column<TData>, rows: any[]): string {
  const mode = col.columnDef.meta?.widthMode
  if (mode === "percent") {
    const value = col.columnDef.meta?.widthValue ?? 10
    const cleanValue = Math.min(Math.max(Math.round(value), 1), 100)

    return `${cleanValue}%`
  }
  if (mode === "autofit") return "max-content"
  return `${col.getSize()}px`
}

export function DataTableColumnHeader<TData, TValue>({
  header,
  table,
  className,
  onPointerDown,
  ...props
}: DataTableColumnHeaderProps<TData, TValue>) {
  const column = header.column
  const label = column.columnDef.meta?.label
    ? column.columnDef.meta.label
    : typeof column.columnDef.header === "string"
      ? column.columnDef.header
      : column.id

  const isAnyColumnResizing = table.getState().columnSizingInfo.isResizingColumn

  const cellVariant = column.columnDef.meta?.cell
  const columnVariant = getColumnVariant(cellVariant?.variant)

  const pinnedPosition = column.getIsPinned()
  const isPinnedLeft = pinnedPosition === "left"
  const isPinnedRight = pinnedPosition === "right"

  const onSortingChange = React.useCallback(
    (direction: SortDirection) => {
      table.setSorting((prev: SortingState) => {
        const existingSortIndex = prev.findIndex((sort) => sort.id === column.id)
        const newSort: ColumnSort = {
          id: column.id,
          desc: direction === "desc",
        }

        if (existingSortIndex >= 0) {
          const updated = [...prev]
          updated[existingSortIndex] = newSort
          return updated
        } else {
          return [...prev, newSort]
        }
      })
    },
    [column.id, table],
  )

  const onSortRemove = React.useCallback(() => {
    table.setSorting((prev: SortingState) => prev.filter((sort) => sort.id !== column.id))
  }, [column.id, table])

  const onLeftPin = React.useCallback(() => {
    column.pin("left")
  }, [column])

  const onRightPin = React.useCallback(() => {
    column.pin("right")
  }, [column])

  const onUnpin = React.useCallback(() => {
    column.pin(false)
  }, [column])

  const onTriggerPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      onPointerDown?.(event)
      if (event.defaultPrevented) return

      if (event.button !== 0) {
        return
      }
      table.options.meta?.onColumnClick?.(column.id)
    },
    [table.options.meta, column.id, onPointerDown],
  )

  if (column.columnDef.meta?.headerVariant === "minimal") {
    return (
      <div className={cn("flex h-8 w-full items-center", className)}>
        <span className="truncate text-xs font-medium text-muted-foreground/70">{label}</span>
      </div>
    )
  }

  if (
    column.columnDef.meta?.headerVariant === "simple" ||
    column.columnDef.meta?.headerVariant === "label-only"
  ) {
    return (
      <div className={cn("group flex h-8 w-full items-center text-xs", className)}>
        <span className="truncate w-full">{label}</span>
        {header.column.getCanResize() && (
          <DataTableColumnResizer header={header} table={table} label={label as string} />
        )}
      </div>
    )
  }

  return (
    <div className={cn("flex group items-center w-full", className)}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              " h-8 w-full py-0! px-0 text-left flex justify-between items-center data-[state=open]:bg-accent",
              isAnyColumnResizing && "pointer-events-none",
            )}
            onPointerDown={onTriggerPointerDown}
            {...props}
          >
            {columnVariant && (
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <columnVariant.icon className="mr-2 w-full size-3.5 shrink-0 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{columnVariant.label}</p>
                </TooltipContent>
              </Tooltip>
            )}
            <span className="truncate pl-2 flex-1 w-full">{label}</span>
            {column.getIsSorted() === "desc" ? (
              <ChevronDownIcon className="size-3 mr-2" />
            ) : column.getIsSorted() === "asc" ? (
              <ChevronUpIcon className="size-3 mr-2" />
            ) : (
              <ChevronsUpDownIcon className="size-3 mr-2 opacity-50" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={0} className="w-60">
          {column.getCanFilter() && (
            <>
              <DataTableColumnFilter header={header} table={table} />
              {column.getCanSort() && <DropdownMenuSeparator />}
            </>
          )}
          {column.getCanSort() && (
            <>
              <DropdownMenuCheckboxItem
                className="relative ltr:pr-8 ltr:pl-2 rtl:pr-2 rtl:pl-8 [&>span:first-child]:ltr:right-2 [&>span:first-child]:ltr:left-auto [&>span:first-child]:rtl:right-auto [&>span:first-child]:rtl:left-2 [&_svg]:text-muted-foreground"
                checked={column.getIsSorted() === "asc"}
                onClick={() => onSortingChange("asc")}
              >
                <ChevronUpIcon />
                Sort asc
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                className="relative ltr:pr-8 ltr:pl-2 rtl:pr-2 rtl:pl-8 [&>span:first-child]:ltr:right-2 [&>span:first-child]:ltr:left-auto [&>span:first-child]:rtl:right-auto [&>span:first-child]:rtl:left-2 [&_svg]:text-muted-foreground"
                checked={column.getIsSorted() === "desc"}
                onClick={() => onSortingChange("desc")}
              >
                <ChevronDownIcon />
                Sort desc
              </DropdownMenuCheckboxItem>
              {column.getIsSorted() && (
                <DropdownMenuItem onClick={onSortRemove}>
                  <XIcon />
                  Remove sort
                </DropdownMenuItem>
              )}
            </>
          )}

          {column.getCanPin() && (
            <>
              {(column.getCanSort() || column.getCanFilter()) && <DropdownMenuSeparator />}

              {isPinnedLeft ? (
                <DropdownMenuItem className="[&_svg]:text-muted-foreground" onClick={onUnpin}>
                  <PinOffIcon />
                  Unpin from left
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className="[&_svg]:text-muted-foreground" onClick={onLeftPin}>
                  <PinIcon />
                  Pin to left
                </DropdownMenuItem>
              )}
              {isPinnedRight ? (
                <DropdownMenuItem className="[&_svg]:text-muted-foreground" onClick={onUnpin}>
                  <PinOffIcon />
                  Unpin from right
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className="[&_svg]:text-muted-foreground" onClick={onRightPin}>
                  <PinIcon />
                  Pin to right
                </DropdownMenuItem>
              )}
            </>
          )}
          {column.getCanHide() && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="[&_svg]:text-muted-foreground"
                onClick={() => column.toggleVisibility(false)}
              >
                <EyeOffIcon />
                Hide column
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {header.column.getCanResize() && (
        <DataTableColumnResizer header={header} table={table} label={label as string} />
      )}
    </div>
  )
}

function DataTableColumnFilter<TData, TValue>({
  header,
  table,
}: {
  header: Header<TData, TValue>
  table: Table<TData>
}) {
  const column = header.column
  const columnMeta = column.columnDef.meta

  const variant = columnMeta?.variant ?? "text"

  const [filters, setFilters] = useQueryState(
    table.options.meta?.queryKeys?.filters ?? "filters",
    getFiltersStateParser<TData>(
      table
        .getAllColumns()
        .filter((column) => column.columnDef.enableColumnFilter)
        .map((column) => column.id),
    )
      .withDefault([])
      .withOptions({
        shallow: false,
        throttleMs: 1000,
      }),
  )

  const filter = React.useMemo(() => {
    return (
      filters.find((f) => f.id === column.id) ??
      ({
        id: column.id as Extract<keyof TData, string>,
        value: "",
        variant: variant,
        operator: getDefaultFilterOperator(variant),
        filterId: uuidv4(),
      } as ExtendedColumnFilter<TData>)
    )
  }, [filters, column.id, variant])

  const [value, setValue] = React.useState(filter.value)
  const [operator, setOperator] = React.useState(filter.operator)
  const [showValueSelector, setShowValueSelector] = React.useState(false)

  React.useEffect(() => {
    if (filter.operator) {
      setOperator(filter.operator)
    }
  }, [filter.operator])

  // Sync state with global filters
  React.useEffect(() => {
    setValue(filter.value)
  }, [filter.value])

  const onFilterUpdate = React.useCallback(
    (_: string, updates: Partial<Omit<ExtendedColumnFilter<TData>, "filterId">>) => {
      setFilters((prev) => {
        const existingIndex = prev.findIndex((f) => f.id === column.id)

        if (existingIndex > -1) {
          // Update existing
          const newFilters = [...prev]
          // If value is empty or undefined, remove the filter
          if (
            updates.value === undefined ||
            updates.value === "" ||
            (Array.isArray(updates.value) && updates.value.length === 0)
          ) {
            newFilters.splice(existingIndex, 1)
            return newFilters
          }
          newFilters[existingIndex] = { ...prev[existingIndex], ...updates }
          return newFilters
        } else {
          // Add new
          // If value is empty, don't add
          if (
            updates.value === undefined ||
            updates.value === "" ||
            (Array.isArray(updates.value) && updates.value.length === 0)
          ) {
            return prev
          }
          return [...prev, { ...filter, operator, ...updates }]
        }
      })
    },
    [column.id, filter, operator, setFilters],
  )

  // Custom Reset Handler to force remove from global state
  const onReset = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setFilters((prev) => prev.filter((f) => f.id !== column.id))
    },
    [column.id, setFilters],
  )

  return (
    <div className="p-2 space-y-2">
      <DataTableFilterInput
        filter={{ ...filter, value, operator }}
        inputId={`header-filter-${column.id}`}
        column={column}
        columnMeta={columnMeta}
        onFilterUpdate={onFilterUpdate}
        showValueSelector={showValueSelector}
        setShowValueSelector={setShowValueSelector}
      />
      {(variant === "date" || variant === "dateRange") && (
        <Button
          variant="secondary"
          size="sm"
          className="w-full justify-center"
          onClick={(e) => {
            e.stopPropagation()
            const newOperator = operator === "isBetween" ? "eq" : "isBetween"
            setOperator(newOperator)
            onFilterUpdate(filter.filterId, {
              operator: newOperator,
              value: undefined,
            })
          }}
        >
          {operator === "isBetween" ? "Switch to Single Date" : "Switch to Date Range"}
        </Button>
      )}
      {!!filter.value && (
        <div className="flex justify-end">
          <button className="text-xs text-destructive hover:text-destructive/50" onClick={onReset}>
            Reset
          </button>
        </div>
      )}
    </div>
  )
}

const DataTableColumnResizer = React.memo(DataTableColumnResizerImpl, (prev, next) => {
  const prevColumn = prev.header.column
  const nextColumn = next.header.column

  if (
    prevColumn.getIsResizing() !== nextColumn.getIsResizing() ||
    prevColumn.getSize() !== nextColumn.getSize()
  ) {
    return false
  }

  // If resizing, we need to check if the deltaOffset has changed
  if (nextColumn.getIsResizing()) {
    const prevDelta = prev.table.getState().columnSizingInfo.deltaOffset
    const nextDelta = next.table.getState().columnSizingInfo.deltaOffset
    if (prevDelta !== nextDelta) return false
  }

  if (prev.label !== next.label) return false

  return true
}) as typeof DataTableColumnResizerImpl

interface DataTableColumnResizerProps<TData, TValue> extends DataTableColumnHeaderProps<
  TData,
  TValue
> {
  label: string
}

function DataTableColumnResizerImpl<TData, TValue>({
  header,
  table,
  label,
}: DataTableColumnResizerProps<TData, TValue>) {
  const defaultColumnDef = table._getDefaultColumnDef()
  const { isResizingColumn, deltaOffset } = table.getState().columnSizingInfo
  const isResizing = header.column.id === isResizingColumn

  const onDoubleClick = React.useCallback(() => {
    header.column.resetSize()
  }, [header.column])

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${label} column`}
      aria-valuenow={header.column.getSize()}
      aria-valuemin={defaultColumnDef.minSize}
      aria-valuemax={defaultColumnDef.maxSize}
      tabIndex={0}
      className={cn(
        "h-10 w-0.5 cursor-ew-resize absolute right-0 top-0 z-50 touch-none select-none bg-primary transition-opacity hover:bg-primary focus:bg-primary focus:outline-none",
        isResizing ? "bg-primary opacity-100" : "opacity-0 group-hover:opacity-100",
      )}
      style={{
        transform: isResizing ? `translateX(${deltaOffset}px)` : undefined,
      }}
      onDoubleClick={onDoubleClick}
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
    />
  )
}
