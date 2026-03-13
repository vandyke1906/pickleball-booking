import { ColumnDef } from "@tanstack/react-table"

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue = unknown> {
    label?: string
    exportValue?: (row: TData) => string | number | boolean | null | undefined
    enableTooltip?: boolean
    widthMode?: "autofit" | "percent"
    widthValue?: number
  }
}
