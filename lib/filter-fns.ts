import type { ExtendedColumnFilter } from "@/lib/data-table/data-table.v3"
import type { Row } from "@tanstack/react-table"
import { isSameDay, isBefore, isAfter, startOfDay, endOfDay } from "date-fns"

export const filterFns = Object.freeze({
  advanced: <TData>(row: Row<TData>, columnId: string, filterValue: unknown) => {
    // If filterValue is not our ExtendedColumnFilter object, fallback to default behavior
    // This handles cases where manualFiltering might be true or other edge cases
    if (!filterValue || typeof filterValue !== "object" || !("operator" in filterValue)) {
      // Fallback to simple equality or inclusion
      const value = row.getValue(columnId)
      return String(value).toLowerCase().includes(String(filterValue).toLowerCase())
    }

    const filter = filterValue as ExtendedColumnFilter<TData>
    const rowValue = row.getValue(columnId)
    const { operator, value, variant } = filter

    // Handle empty/not empty universally
    if (operator === "isEmpty") {
      return (
        rowValue === null ||
        rowValue === undefined ||
        rowValue === "" ||
        (Array.isArray(rowValue) && rowValue.length === 0)
      )
    }
    if (operator === "isNotEmpty") {
      return (
        rowValue !== null &&
        rowValue !== undefined &&
        rowValue !== "" &&
        (!Array.isArray(rowValue) || rowValue.length > 0)
      )
    }

    // Handle null/undefined values for other operators
    if (rowValue === null || rowValue === undefined) {
      return false
    }

    switch (variant) {
      case "text": {
        const strValue = String(rowValue).toLowerCase()
        const filterStr = String(value).toLowerCase()
        switch (operator) {
          case "iLike":
            return strValue.includes(filterStr)
          case "notILike":
            return !strValue.includes(filterStr)
          case "eq":
            return strValue === filterStr
          case "ne":
            return strValue !== filterStr
          default:
            return true
        }
      }
      case "number": {
        const numValue = Number(rowValue)
        const filterNum = Number(value)
        if (isNaN(numValue)) return false

        switch (operator) {
          case "eq":
            return numValue === filterNum
          case "ne":
            return numValue !== filterNum
          case "lt":
            return numValue < filterNum
          case "lte":
            return numValue <= filterNum
          case "gt":
            return numValue > filterNum
          case "gte":
            return numValue >= filterNum
          case "isBetween": {
            if (Array.isArray(value)) {
              const [min, max] = value.map(Number)
              if (!isNaN(min) && !isNaN(max)) {
                return numValue >= min && numValue <= max
              }
            }
            return false
          }
          default:
            return true
        }
      }
      case "date":
      case "dateRange": {
        // Assume rowValue is Date object or ISO string. Convert to Date.
        const dateValue =
          rowValue instanceof Date ? rowValue : new Date(rowValue as string | number | Date)

        if (isNaN(dateValue.getTime())) return false

        // filter.value passed from DateTableFilterInput is often string timestamp (ms)
        // or array of string timestamps.

        let filterDate: Date | undefined
        let filterDateEnd: Date | undefined

        if (Array.isArray(value)) {
          if (value[0]) filterDate = new Date(Number(value[0]))
          if (value[1]) filterDateEnd = new Date(Number(value[1]))
        } else if (value) {
          filterDate = new Date(Number(value))
        }

        switch (operator) {
          case "eq":
            return filterDate ? isSameDay(dateValue, filterDate) : true
          case "ne":
            return filterDate ? !isSameDay(dateValue, filterDate) : true
          case "lt": // Is before
            return filterDate ? isBefore(dateValue, startOfDay(filterDate)) : true
          case "lte": // Is on or before
            return filterDate ? isBefore(dateValue, endOfDay(filterDate)) : true
          case "gt": // Is after
            return filterDate ? isAfter(dateValue, endOfDay(filterDate)) : true
          case "gte": // Is on or after
            return filterDate ? isAfter(dateValue, startOfDay(filterDate)) : true
          case "isBetween": {
            if (filterDate && filterDateEnd) {
              return (
                (isAfter(dateValue, startOfDay(filterDate)) || isSameDay(dateValue, filterDate)) &&
                (isBefore(dateValue, endOfDay(filterDateEnd)) ||
                  isSameDay(dateValue, filterDateEnd))
              )
            }
            return true
          }
          // TODO: isRelativeToToday
          default:
            return true
        }
      }
      case "select":
      case "multiSelect": {
        const filterValues = Array.isArray(value) ? value : [value]
        const rowValueStr = String(rowValue)

        switch (operator) {
          case "eq":
            return filterValues.includes(rowValueStr)
          case "ne":
            return !filterValues.includes(rowValueStr)
          case "inArray":
            // Row value can be single or array?
            // Usually for multiSelect variant column, row value might be array (tags) or single.
            // If rowValue is array: has ANY of filterValues?
            if (Array.isArray(rowValue)) {
              return rowValue.some((v) => filterValues.includes(String(v)))
            }
            return filterValues.includes(rowValueStr)
          case "notInArray":
            if (Array.isArray(rowValue)) {
              return !rowValue.some((v) => filterValues.includes(String(v)))
            }
            return !filterValues.includes(rowValueStr)
        }
        return true
      }
      case "boolean": {
        const rowBool = Boolean(rowValue)
        const filterBool = value === "true"

        switch (operator) {
          case "eq":
            return rowBool === filterBool
          case "ne":
            return rowBool !== filterBool
        }
        return true
      }
      default:
        return true
    }
  },
})
