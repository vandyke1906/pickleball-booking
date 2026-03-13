import { type Table } from "@tanstack/react-table"

interface DataTableHighlightCellProps<TData> {
  value: string | number | null | undefined
  table: Table<TData>
}

export function DataTableHighlightCell<TData>({ value, table }: DataTableHighlightCellProps<TData>) {
  const searchTerm = (table.getState().globalFilter as string) ?? ""

  const stringValue = String(value ?? "")

  if (!searchTerm || !stringValue) {
    return <>{stringValue}</>
  }

  // Escape special regex characters in the search term
  const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const parts = stringValue.split(new RegExp(`(${escapedSearchTerm})`, "gi"))

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === searchTerm.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}
