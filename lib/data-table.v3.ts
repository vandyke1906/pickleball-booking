import type * as reactTable from "@tanstack/react-table"
import {
  BaselineIcon,
  TextInitialIcon,
  HashIcon,
  LinkIcon,
  CheckSquareIcon,
  ListIcon,
  ListChecksIcon,
  CalendarIcon,
  FileIcon,
} from "lucide-react"
import { dataTableFilterV3Config } from "@/lib/config/data-table.v3"
import {
  ExtendedColumnFilter,
  CellOpts,
  FilterOperator,
  FilterVariant,
} from "@/lib/data-table/data-table.v3"

export function getCommonPinningStyles<TData>({
  column,
  withBorder = false,
}: {
  column: reactTable.Column<TData>
  withBorder?: boolean
}): React.CSSProperties {
  const isPinned = column.getIsPinned()
  const isLastLeftPinnedColumn = isPinned === "left" && column.getIsLastColumn("left")
  const isFirstRightPinnedColumn = isPinned === "right" && column.getIsFirstColumn("right")

  return {
    boxShadow: withBorder
      ? isLastLeftPinnedColumn
        ? "-4px 0 4px -4px var(--border) inset"
        : isFirstRightPinnedColumn
          ? "4px 0 4px -4px var(--border) inset"
          : undefined
      : undefined,
    left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    opacity: isPinned ? 0.97 : 1,
    position: isPinned ? "sticky" : "relative",
    width: column.getSize(),
    zIndex: isPinned ? 1 : undefined,
  }
}

export function getFilterOperators(filterVariant: FilterVariant) {
  const operatorMap: Record<FilterVariant, { label: string; value: FilterOperator }[]> = {
    text: dataTableFilterV3Config.textOperators,
    number: dataTableFilterV3Config.numericOperators,
    range: dataTableFilterV3Config.numericOperators,
    date: dataTableFilterV3Config.dateOperators,
    dateRange: dataTableFilterV3Config.dateOperators,
    boolean: dataTableFilterV3Config.booleanOperators,
    select: dataTableFilterV3Config.selectOperators,
    multiSelect: dataTableFilterV3Config.multiSelectOperators,
  }

  return operatorMap[filterVariant] ?? dataTableFilterV3Config.textOperators
}

export function getDefaultFilterOperator(filterVariant: FilterVariant) {
  const operators = getFilterOperators(filterVariant)

  return operators[0]?.value ?? (filterVariant === "text" ? "iLike" : "eq")
}

export function getValidFilters<TData>(
  filters: ExtendedColumnFilter<TData>[],
): ExtendedColumnFilter<TData>[] {
  return filters.filter(
    (filter) =>
      filter.operator === "isEmpty" ||
      filter.operator === "isNotEmpty" ||
      (Array.isArray(filter.value)
        ? filter.value.length > 0
        : filter.value !== "" && filter.value !== null && filter.value !== undefined),
  )
}

export function getColumnVariant(variant?: CellOpts["variant"]): {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
} | null {
  switch (variant) {
    case "short-text":
      return { label: "Short text", icon: BaselineIcon }
    case "long-text":
      return { label: "Long text", icon: TextInitialIcon }
    case "number":
      return { label: "Number", icon: HashIcon }
    case "url":
      return { label: "URL", icon: LinkIcon }
    case "checkbox":
      return { label: "Checkbox", icon: CheckSquareIcon }
    case "select":
      return { label: "Select", icon: ListIcon }
    case "multi-select":
      return { label: "Multi-select", icon: ListChecksIcon }
    case "date":
      return { label: "Date", icon: CalendarIcon }
    case "file":
      return { label: "File", icon: FileIcon }
    default:
      return null
  }
}
