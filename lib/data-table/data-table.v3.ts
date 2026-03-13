/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ColumnSort, Row, RowData } from "@tanstack/react-table"
import type { DataTableFilterV3Config } from "@/lib/config/data-table.v3"
import type { FilterItemSchema } from "@/lib/parsers"
import type { ColumnDef, SortingState, VisibilityState, ColumnPinningState } from "@tanstack/react-table"

declare module "@tanstack/react-table" {
  interface TableMeta<TData extends RowData> {
    queryKeys?: QueryKeys
    onColumnClick?: (columnId: string) => void
  }

  interface ColumnMeta<TData extends RowData, TValue> {
    label?: string
    placeholder?: string
    headerVariant?: "simple" | "default" | "minimal" | "label-only"
    variant?: FilterVariant
    options?: Option[]
    range?: [number, number]
    unit?: string
    icon?: React.FC<React.SVGProps<SVGSVGElement>>
    cell?: CellOpts
  }
}

export interface QueryKeys {
  page: string
  perPage: string
  sort: string
  filters: string
  joinOperator: string
  search: string
}

export interface Option {
  label: string
  value: string
  count?: number
  icon?: React.FC<React.SVGProps<SVGSVGElement>>
}

export type FilterOperator = DataTableFilterV3Config["operators"][number]
export type FilterVariant = DataTableFilterV3Config["filterVariants"][number]
export type JoinOperator = DataTableFilterV3Config["joinOperators"][number]

export interface ExtendedColumnSort<TData> extends Omit<ColumnSort, "id"> {
  id: Extract<keyof TData, string>
}

export interface ExtendedColumnFilter<TData> extends FilterItemSchema {
  id: Extract<keyof TData, string>
}

export interface DataTableRowAction<TData> {
  row: Row<TData>
  variant: "update" | "delete"
}

export interface CellSelectOption {
  label: string
  value: string
  icon?: React.FC<React.SVGProps<SVGSVGElement>>
  count?: number
}

export type CellOpts =
  | {
      variant: "short-text"
    }
  | {
      variant: "long-text"
    }
  | {
      variant: "number"
      min?: number
      max?: number
      step?: number
    }
  | {
      variant: "select"
      options: CellSelectOption[]
    }
  | {
      variant: "multi-select"
      options: CellSelectOption[]
    }
  | {
      variant: "checkbox"
    }
  | {
      variant: "date"
    }
  | {
      variant: "url"
    }
  | {
      variant: "file"
      maxFileSize?: number
      maxFiles?: number
      accept?: string
      multiple?: boolean
    }

//#Added
export interface ExtendedColumnSort<TData> {
  id: Extract<keyof TData, string>
  desc: boolean
}
export interface DataTableV3Config<TData> {
  columns: ColumnDef<TData>[]
  data: TData[]
  pageCount?: number
  enableRowSelection?: boolean
  enableColumnPinning?: boolean
  enableAdvancedFilter?: boolean
  manualPagination?: boolean
  manualSorting?: boolean
  manualFiltering?: boolean
  initialState?: {
    sorting?: ExtendedColumnSort<TData>[]
    columnVisibility?: VisibilityState
    columnPinning?: ColumnPinningState
    globalFilter?: string
    [key: string]: any
  }
  getRowId?: (row: TData) => string
  shallow?: boolean
  debounceMs?: number
  throttleMs?: number
}

export interface DataTableV3Features {
  showSearch?: boolean
  searchPlaceholder?: string
  showExport?: boolean
  showSort?: boolean
  showFilter?: boolean
  showViewOptions?: boolean
  height?: string
}
