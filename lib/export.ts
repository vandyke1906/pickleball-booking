/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Table } from "@tanstack/react-table"
import * as XLSX from "xlsx"

export interface ExportOptions {
  filename?: string
  sheetName?: string
  mainColumns?: string[] // optional: only export these top-level fields
  excludeColumns?: string[] // optional: skip these top-level fields
  arrayField?: string | string[] // name of the array field to expand
  arrayColumns?: string[] // which sub-object keys to include from the array
  arrayPrefix?: string // prefix for expanded columns e.g. "AD " → "AD 1", "AD 2", ...
}

export function exportTableToXLSX<TData>(
  table: Table<TData>,
  options: {
    filename?: string
    excludeColumns?: string[]
    onlySelected?: boolean
  } = {},
) {
  const {
    filename = "export",
    excludeColumns = ["select", "actions"],
    onlySelected = false,
  } = options

  const rows = onlySelected
    ? table.getFilteredSelectedRowModel().rows
    : table.getFilteredRowModel().rows

  if (rows.length === 0) {
    console.warn("No rows to export")
    return
  }

  // Collect headers in visible order
  const headers: string[] = []
  table.getVisibleFlatColumns().forEach((col) => {
    if (excludeColumns.includes(col.id)) return

    const header =
      typeof col.columnDef.header === "function"
        ? col.id
        : ((col.columnDef.header as string | undefined) ?? col.id)

    headers.push(header)
  })

  // Build data rows
  const data = rows.map((row) => {
    const rowData: Record<string, any> = {}

    row.getVisibleCells().forEach((cell) => {
      const col = cell.column
      if (excludeColumns.includes(col.id)) return

      const header =
        typeof col.columnDef.header === "function"
          ? col.id
          : ((col.columnDef.header as string | undefined) ?? col.id)

      let value: any

      // Check in meta first
      if (col.columnDef.meta?.exportValue && typeof col.columnDef.meta.exportValue === "function") {
        value = col.columnDef.meta.exportValue(row.original)
      }
      // then renderValue, then getValue...
      else {
        const rendered = cell.renderValue()
        value =
          typeof rendered === "string" || typeof rendered === "number"
            ? rendered
            : (cell.getValue() ?? "")
      }

      // Clean up value
      if (value === null || value === undefined) {
        value = ""
      } else if (typeof value === "object") {
        value = JSON.stringify(value) // prevent [object Object]
      }

      rowData[header] = value
    })

    return rowData
  })

  // Create worksheet with ordered headers
  const worksheet = XLSX.utils.json_to_sheet(data, { header: headers })

  // Auto-size columns based on content length
  const colWidths = headers.map((header, i) => {
    let maxLen = header.length
    data.forEach((row) => {
      const val = row[header]
      if (val && String(val).length > maxLen) {
        maxLen = String(val).length
      }
    })
    return { wch: Math.min(60, Math.max(10, maxLen + 2)) } // cap at 60 chars
  })

  worksheet["!cols"] = colWidths

  // Create workbook and export
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data")
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

// Same logic for CSV (just change file extension and writer)
export function exportTableToCSV<TData>(
  table: Table<TData>,
  options: {
    filename?: string
    excludeColumns?: string[]
    onlySelected?: boolean
  } = {},
) {
  const {
    filename = "export",
    excludeColumns = ["select", "actions"],
    onlySelected = false,
  } = options

  const rows = onlySelected
    ? table.getFilteredSelectedRowModel().rows
    : table.getFilteredRowModel().rows

  if (rows.length === 0) return

  const headers: string[] = []
  table.getVisibleFlatColumns().forEach((col) => {
    if (excludeColumns.includes(col.id)) return
    const header =
      typeof col.columnDef.header === "function"
        ? col.id
        : ((col.columnDef.header as string | undefined) ?? col.id)
    headers.push(header)
  })

  const data = rows.map((row) => {
    const rowData: Record<string, any> = {}
    row.getVisibleCells().forEach((cell) => {
      const col = cell.column
      if (excludeColumns.includes(col.id)) return

      const header =
        typeof col.columnDef.header === "function"
          ? col.id
          : ((col.columnDef.header as string | undefined) ?? col.id)

      let value: any

      if ("exportValue" in col.columnDef && typeof col.columnDef.exportValue === "function") {
        value = col.columnDef.exportValue(row.original)
      } else {
        const rendered = cell.renderValue()
        value =
          typeof rendered === "string" || typeof rendered === "number"
            ? rendered
            : (cell.getValue() ?? "")
      }

      if (value === null || value === undefined) value = ""
      if (typeof value === "object") value = JSON.stringify(value)

      rowData[header] = value
    })
    return rowData
  })

  const worksheet = XLSX.utils.json_to_sheet(data, { header: headers })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data")
  XLSX.writeFile(workbook, `${filename}.csv`)
}

function normalizeArrayFields(arrayField?: string | string[]): string[] {
  if (!arrayField) return []
  if (Array.isArray(arrayField)) return arrayField
  return [arrayField]
}

export function exportToXLSX(data: Record<string, any>[], options: ExportOptions = {}) {
  const {
    filename = "export",
    sheetName = "Data",
    mainColumns,
    excludeColumns = ["color", "count", "order"],
    arrayField,
    arrayColumns = ["name"],
    arrayPrefix = "",
  } = options

  if (!data || data.length === 0) {
    console.warn("No data to export")
    return
  }

  const arrayFields = normalizeArrayFields(arrayField)

  // ───────────────────────────────────────────────
  //  1. Determine top-level columns
  // ───────────────────────────────────────────────
  const allMainKeys = Object.keys(data[0])
  let finalMainColumns = mainColumns || allMainKeys.filter((key) => !excludeColumns.includes(key))

  // Prefer "title" first if present
  if (!finalMainColumns.includes("title") && allMainKeys.includes("title")) {
    finalMainColumns = ["title", ...finalMainColumns.filter((k) => k !== "title")]
  }

  // Remove array fields from main columns (they will be expanded separately)
  finalMainColumns = finalMainColumns.filter((key) => !arrayFields.includes(key))

  // ───────────────────────────────────────────────
  //  2. Find maximum length across all array fields
  // ───────────────────────────────────────────────
  let maxArrayLength = 0
  data.forEach((item) => {
    arrayFields.forEach((field) => {
      const arr = Array.isArray(item[field]) ? item[field] : []
      maxArrayLength = Math.max(maxArrayLength, arr.length)
    })
  })

  // ───────────────────────────────────────────────
  //  3. Build flat rows
  // ───────────────────────────────────────────────
  const flatRows = data.map((item) => {
    const row: Record<string, any> = {}

    // Main (scalar) columns
    finalMainColumns.forEach((col) => {
      let value = item[col]
      if (value === null || value === undefined) {
        value = ""
      } else if (typeof value === "object" && !Array.isArray(value)) {
        value = JSON.stringify(value)
      } else if (Array.isArray(value)) {
        value = value.join(", ")
      }
      row[col] = value
    })

    // Expand each array field
    arrayFields.forEach((field) => {
      const arr = Array.isArray(item[field]) ? item[field] : []

      for (let i = 0; i < maxArrayLength; i++) {
        const entry = arr[i] || {}
        arrayColumns.forEach((subKey) => {
          const colName = `${arrayPrefix}${i + 1} ${subKey}`
          let val = entry[subKey]
          if (val === null || val === undefined) val = ""
          else if (typeof val === "object") val = JSON.stringify(val)
          row[colName] = val
        })
      }
    })

    return row
  })

  // ───────────────────────────────────────────────
  //  4. Create worksheet + auto-size
  // ───────────────────────────────────────────────
  const worksheet = XLSX.utils.json_to_sheet(flatRows)

  const headers = Object.keys(flatRows[0] || {})
  const colWidths = headers.map((header) => {
    let maxLen = header.length
    flatRows.forEach((row) => {
      const val = row[header]
      const strLen = val ? String(val).length : 0
      if (strLen > maxLen) maxLen = strLen
    })
    return { wch: Math.min(60, Math.max(10, maxLen + 2)) }
  })

  worksheet["!cols"] = colWidths

  // ───────────────────────────────────────────────
  //  5. Export
  // ───────────────────────────────────────────────
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

/**
 * CSV version – similar logic
 */
export function exportToCSV(data: Record<string, any>[], options: ExportOptions = {}) {
  const {
    filename = "export",
    mainColumns,
    excludeColumns = ["color", "count", "order"],
    arrayField,
    arrayColumns = ["name"],
    arrayPrefix = "",
  } = options

  if (!data || data.length === 0) {
    console.warn("No data to export")
    return
  }

  const arrayFields = normalizeArrayFields(arrayField)

  const allKeys = Object.keys(data[0])
  let finalMainColumns = mainColumns || allKeys.filter((k) => !excludeColumns.includes(k))

  if (allKeys.includes("title") && !finalMainColumns.includes("title")) {
    finalMainColumns = ["title", ...finalMainColumns.filter((k) => k !== "title")]
  }

  finalMainColumns = finalMainColumns.filter((key) => !arrayFields.includes(key))

  let maxArrayLength = 0
  data.forEach((item) => {
    arrayFields.forEach((field) => {
      const arr = Array.isArray(item[field]) ? item[field] : []
      maxArrayLength = Math.max(maxArrayLength, arr.length)
    })
  })

  // Build headers
  const headers: string[] = [...finalMainColumns]

  arrayFields.forEach(() => {
    // same structure for each array field
    for (let i = 0; i < maxArrayLength; i++) {
      arrayColumns.forEach((subKey) => {
        headers.push(`${arrayPrefix}${i + 1} ${subKey}`)
      })
    }
  })

  const rows = data.map((item) => {
    const values: string[] = []

    // Main columns
    finalMainColumns.forEach((col) => {
      let val = item[col]
      if (val === null || val === undefined) val = ""
      else if (Array.isArray(val)) val = val.join(", ")
      else if (typeof val === "object") val = JSON.stringify(val)
      values.push(String(val))
    })

    // Expanded arrays (same order as headers)
    arrayFields.forEach((field) => {
      const arr = Array.isArray(item[field]) ? item[field] : []
      for (let i = 0; i < maxArrayLength; i++) {
        const entry = arr[i] || {}
        arrayColumns.forEach((subKey) => {
          let val = entry[subKey]
          if (val === null || val === undefined) val = ""
          else if (typeof val === "object") val = JSON.stringify(val)
          values.push(String(val))
        })
      }
    })

    return values
  })

  const escapeCsvValue = (val: string) => {
    if (val.includes('"') || val.includes(",") || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const csvLines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ]

  const csvContent = csvLines.join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
