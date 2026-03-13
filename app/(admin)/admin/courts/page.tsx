"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { useCourts } from "@/lib/hooks/court/court.hook"
import { Court } from "@prisma/client"
import { useSession } from "next-auth/react"
import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { LandPlot } from "lucide-react"
import { DataTableV3 } from "@/components/data-table/data-table.v3"
import { formatFloat } from "@/lib/utils"

export type TCourt = Court

export default function CourtPage() {
  const { data: session } = useSession()
  const { data, isLoading, isError, error } = useCourts()

  if (isError) return <p>Error: {String(error)}</p>

  const columns = useMemo<ColumnDef<TCourt>[]>(
    () => [
      {
        accessorKey: "name",
        header: (props) => <DataTableColumnHeader {...props} />,
        cell: ({ row }) => row.original.name,
        meta: {
          label: "Name",
          variant: "text",
          options: [],
          exportValue: (row) => row.name ?? "",
          widthMode: "autofit",
        },
      },
      {
        accessorKey: "pricePerHour",
        header: (props) => <DataTableColumnHeader {...props} />,
        cell: ({ row }) => (
          <div className="w-full text-right">{formatFloat(row.original?.pricePerHour ?? 0)}</div>
        ),
        meta: {
          label: "Price/Hour",
          variant: "text",
          options: [],
          exportValue: (row) => formatFloat(row.pricePerHour ?? 0),
          widthMode: "percent",
          widthValue: 5,
        },
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <LandPlot className="h-6 w-6 text-primary" />
              <h1>Courts</h1>
            </div>
          </div>

          <DataTableV3<TCourt>
            data={data ?? []}
            columns={columns}
            isLoading={isLoading}
            features={{
              searchPlaceholder: "Search Court",
              showSearch: true,
              showExport: true,
              showSort: true,
              showFilter: true,
              showViewOptions: true,
              height: "auto",
            }}
            config={{
              enableAdvancedFilter: true,
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
