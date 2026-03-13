import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"

import { useDataTable } from "@/lib/hooks/use-data-table.v3"
import { DataTable } from "@/components/data-table/data-table"
import { DataTableSortList } from "@/components/data-table/data-table-sort-list"
import { DataTableFilterList } from "@/components/data-table/data-table-filter-list"
import { DataTableExportOptions } from "@/components/data-table/data-table-export-options"
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options"
import { Input } from "@/components/ui/input"

import type { DataTableV3Config, DataTableV3Features } from "@/lib/data-table/data-table.v3"
import { useMemo } from "react"

interface DataTableV3Props<TData> {
  data?: TData[]
  columns?: ColumnDef<TData>[]
  config?: Partial<DataTableV3Config<TData>>
  features?: DataTableV3Features
  actionBar?: React.ReactNode
  actionsRenderer?: (row: TData) => React.ReactNode // for row actions column
  isLoading?: boolean // override / manual control
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

export function DataTableV3<TData>({
  data: staticData,
  columns: staticColumns,
  config = {},
  features = {
    showSearch: true,
    searchPlaceholder: "Search...",
    showExport: true,
    showSort: true,
    showFilter: true,
    showViewOptions: true,
    height: "calc(100vh - 124px)",
  },
  actionBar,
  actionsRenderer,
  isLoading: controlledIsLoading,
  dynamicFilterOptions,
}: DataTableV3Props<TData>) {
  const { data: queriedData = [], isLoading: queryLoading } = {
    data: staticData ?? [],
    isLoading: false,
  }

  const data = staticData ?? queriedData
  const isFetching = controlledIsLoading ?? false

  const finalColumns = useMemo(
    () =>
      actionsRenderer
        ? [
            ...(staticColumns ?? []),
            {
              id: "actions",
              header: "Actions",
              cell: ({ row }) => actionsRenderer(row.original),
              enableHiding: false,
            } satisfies ColumnDef<TData>,
          ]
        : (staticColumns ?? []),
    [staticColumns, actionsRenderer],
  )

  const { table, shallow, debounceMs, throttleMs } = useDataTable({
    data,
    columns: finalColumns,
    pageCount: config.pageCount ?? -1,
    enableAdvancedFilter: config.enableAdvancedFilter ?? true,
    manualPagination: config.manualPagination ?? false,
    manualSorting: config.manualSorting ?? false,
    manualFiltering: config.manualFiltering ?? false,
    initialState: {
      sorting: config.initialState?.sorting ?? [],
      columnPinning: config.initialState?.columnPinning ?? {
        left: config.enableRowSelection ? ["select"] : [],
        right: ["actions"],
      },
      ...config.initialState,
    },
    getRowId: config.getRowId,
    shallow: config.shallow ?? false,
    clearOnDefault: true,
  })

  return (
    <DataTable
      table={table}
      isLoading={isFetching}
      height={features.height}
      actionBar={actionBar}
      dynamicFilterOptions={dynamicFilterOptions}
      totalCount={config.totalCount ?? 0}
    >
      <div className="flex items-center justify-between gap-2.5 pb-4">
        {features.showSearch && (
          <Input
            type="search"
            placeholder={features.searchPlaceholder}
            value={(table.getState().globalFilter as string) ?? ""}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            className="h-8 w-[180px] lg:w-[280px]"
          />
        )}

        <div className="flex items-center gap-2">
          {features.showExport && <DataTableExportOptions table={table} />}
          {features.showSort && <DataTableSortList table={table} />}
          {features.showFilter && (
            <DataTableFilterList
              table={table}
              shallow={shallow}
              debounceMs={debounceMs}
              throttleMs={throttleMs}
              dynamicFilterOptions={dynamicFilterOptions}
            />
          )}
          {features.showViewOptions && <DataTableViewOptions table={table} align="end" />}
        </div>
      </div>
    </DataTable>
  )
}
