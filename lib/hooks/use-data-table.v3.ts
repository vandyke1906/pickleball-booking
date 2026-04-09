"use client"

import {
  AccessorColumnDef,
  type ColumnFiltersState,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type TableOptions,
  type TableState,
  type Updater,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table"
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  type SingleParser,
  type UseQueryStateOptions,
  useQueryState,
  useQueryStates,
} from "nuqs"
import * as React from "react"

import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback"
import { getFiltersStateParser, getSortingStateParser } from "@/lib/parsers"
import { ExtendedColumnSort, QueryKeys } from "@/lib/data-table/data-table.v3"
import { filterFns } from "@/lib/filter-fns"

const SEARCH_KEY = "search"
const PAGE_KEY = "page"
const PER_PAGE_KEY = "perPage"
const SORT_KEY = "sort"
const FILTERS_KEY = "filters"
const JOIN_OPERATOR_KEY = "joinOperator"
const ARRAY_SEPARATOR = ","
const DEBOUNCE_MS = 300
const THROTTLE_MS = 50

interface UseDataTableProps<TData>
  extends
    Omit<TableOptions<TData>, "state" | "pageCount" | "getCoreRowModel">,
    Required<Pick<TableOptions<TData>, "pageCount">> {
  initialState?: Omit<Partial<TableState>, "sorting"> & {
    sorting?: ExtendedColumnSort<TData>[]
  }
  queryKeys?: Partial<QueryKeys>
  history?: "push" | "replace"
  debounceMs?: number
  throttleMs?: number
  clearOnDefault?: boolean
  enableAdvancedFilter?: boolean
  scroll?: boolean
  shallow?: boolean
  startTransition?: React.TransitionStartFunction
}

export function useDataTable<TData>(props: UseDataTableProps<TData>) {
  const {
    columns,
    pageCount = -1,
    initialState,
    queryKeys,
    history = "replace",
    debounceMs = DEBOUNCE_MS,
    throttleMs = THROTTLE_MS,
    clearOnDefault = false,
    enableAdvancedFilter = false,
    scroll = false,
    shallow = true,
    manualPagination = true,
    manualSorting = true,
    manualFiltering = true,
    startTransition,
    ...tableProps
  } = props
  const pageKey = queryKeys?.page ?? PAGE_KEY
  const perPageKey = queryKeys?.perPage ?? PER_PAGE_KEY
  const sortKey = queryKeys?.sort ?? SORT_KEY
  const filtersKey = queryKeys?.filters ?? FILTERS_KEY
  const joinOperatorKey = queryKeys?.joinOperator ?? JOIN_OPERATOR_KEY
  const searchKey = queryKeys?.search ?? SEARCH_KEY

  const queryStateOptions = React.useMemo<Omit<UseQueryStateOptions<string>, "parse">>(
    () => ({
      history,
      scroll,
      shallow,
      throttleMs,
      debounceMs,
      clearOnDefault,
      startTransition,
    }),
    [history, scroll, shallow, throttleMs, debounceMs, clearOnDefault, startTransition],
  )

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
    initialState?.rowSelection ?? {},
  )
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    initialState?.columnVisibility ?? {},
  )

  const [page, setPage] = useQueryState(
    pageKey,
    parseAsInteger.withOptions(queryStateOptions).withDefault(1),
  )
  const [perPage, setPerPage] = useQueryState(
    perPageKey,
    parseAsInteger
      .withOptions(queryStateOptions)
      .withDefault(initialState?.pagination?.pageSize ?? 50), //TODO get default page size from env or config
  )
  //TODO set table pagination

  const pagination: PaginationState = React.useMemo(() => {
    return {
      pageIndex: page - 1,
      pageSize: perPage,
    }
  }, [page, perPage])

  const stableColumns = React.useMemo(
    () =>
      columns.map((col) => {
        const maybeAccessor = col as { accessorKey?: string }
        return {
          ...col,
          id: col.id ?? maybeAccessor.accessorKey,
        }
      }),
    [columns],
  )

  const onPaginationChange = React.useCallback(
    (updaterOrValue: Updater<PaginationState>) => {
      if (typeof updaterOrValue === "function") {
        const newPagination = updaterOrValue(pagination)
        void setPage(newPagination.pageIndex + 1)
        void setPerPage(newPagination.pageSize)
      } else {
        void setPage(updaterOrValue.pageIndex + 1)
        void setPerPage(updaterOrValue.pageSize)
      }
    },
    [pagination, setPage, setPerPage],
  )

  const columnIds = React.useMemo(() => {
    return new Set(stableColumns.map((column) => column.id).filter(Boolean) as string[])
  }, [stableColumns])

  const [sorting, setSorting] = useQueryState(
    sortKey,
    getSortingStateParser<TData>(columnIds)
      .withOptions(queryStateOptions)
      .withDefault(initialState?.sorting ?? []),
  )

  const [globalFilter, setGlobalFilter] = useQueryState(
    searchKey,
    parseAsString.withOptions(queryStateOptions).withDefault(""),
  )

  const onGlobalFilterChange = React.useCallback(
    (updaterOrValue: Updater<string>) => {
      if (typeof updaterOrValue === "function") {
        const newFilter = updaterOrValue(globalFilter)
        void setGlobalFilter(newFilter)
      } else {
        void setGlobalFilter(updaterOrValue)
      }
    },
    [globalFilter, setGlobalFilter],
  )

  const onSortingChange = React.useCallback(
    (updaterOrValue: Updater<SortingState>) => {
      if (typeof updaterOrValue === "function") {
        const newSorting = updaterOrValue(sorting)
        setSorting(newSorting as ExtendedColumnSort<TData>[])
      } else {
        setSorting(updaterOrValue as ExtendedColumnSort<TData>[])
      }
    },
    [sorting, setSorting],
  )

  const filterableColumns = React.useMemo(() => {
    if (enableAdvancedFilter) return []

    return columns.filter((column) => column.enableColumnFilter)
  }, [columns, enableAdvancedFilter])

  const filterParsers = React.useMemo(() => {
    if (enableAdvancedFilter) return {}
    return filterableColumns.reduce<Record<string, SingleParser<string> | SingleParser<string[]>>>(
      (acc, column) => {
        if (
          column.meta?.options ||
          column.meta?.variant === "dateRange" ||
          column.meta?.variant === "multiSelect"
        ) {
          acc[column.id ?? ""] = parseAsArrayOf(parseAsString, ARRAY_SEPARATOR).withOptions(
            queryStateOptions,
          )
        } else {
          acc[column.id ?? ""] = parseAsString.withOptions(queryStateOptions)
        }
        return acc
      },
      {},
    )
  }, [filterableColumns, queryStateOptions, enableAdvancedFilter])

  const [filterValues, setFilterValues] = useQueryStates(filterParsers)

  const debouncedSetFilterValues = useDebouncedCallback((values: typeof filterValues) => {
    void setPage(1)
    void setFilterValues(values)
  }, debounceMs)

  const [advancedFilters] = useQueryState(
    filtersKey,
    getFiltersStateParser(columnIds).withOptions(queryStateOptions).withDefault([]),
  )

  const columnFilters: ColumnFiltersState = React.useMemo(() => {
    if (enableAdvancedFilter) {
      return advancedFilters.map((filter) => ({
        id: filter.id,
        value: filter,
      }))
    }

    return Object.entries(filterValues).reduce<ColumnFiltersState>((filters, [key, value]) => {
      if (value !== null) {
        const processedValue = Array.isArray(value)
          ? value
          : typeof value === "string" && /[^a-zA-Z0-9]/.test(value)
            ? value.split(/[^a-zA-Z0-9]+/).filter(Boolean)
            : [value]
        filters.push({ id: key, value: processedValue })
      }
      return filters
    }, [])
  }, [filterValues, advancedFilters, enableAdvancedFilter])

  const onColumnFiltersChange = React.useCallback(
    (updaterOrValue: Updater<ColumnFiltersState>) => {
      if (enableAdvancedFilter) return
      const next =
        typeof updaterOrValue === "function" ? updaterOrValue(columnFilters) : updaterOrValue
      const filterUpdates = Object.fromEntries(
        filterableColumns.map((col) => {
          const match = next.find((f) => f.id === col.id)
          return [col.id!, match ? (match.value as string | string[]) : null]
        }),
      )
      debouncedSetFilterValues(filterUpdates)
    },
    [debouncedSetFilterValues, filterableColumns, enableAdvancedFilter, columnFilters],
  )
  const table = useReactTable({
    ...tableProps,
    columns,
    initialState,
    pageCount,
    state: {
      pagination,
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      globalFilter,
    },
    defaultColumn: {
      ...tableProps.defaultColumn,
      minSize: 50,
      maxSize: 800,
      enableColumnFilter: true,
      filterFn: filterFns.advanced,
    },
    filterFns,
    columnResizeMode: "onEnd",
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    manualPagination,
    manualSorting,
    manualFiltering,
    meta: {
      ...tableProps.meta,
      queryKeys: {
        page: pageKey,
        perPage: perPageKey,
        sort: sortKey,
        filters: filtersKey,
        joinOperator: joinOperatorKey,
        search: searchKey,
      },
    },
  })

  return { table, shallow, debounceMs, throttleMs }
}
