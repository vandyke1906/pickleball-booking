"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { LandPlot, Plus } from "lucide-react"
import { DataTableV3 } from "@/components/data-table/data-table.v3"
import { useSearchParams } from "next/navigation"
import { TOpenPlayData, useOrganizationOpenPlays } from "@/lib/hooks/open-play/open-play.hook"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function OpenPlaysList({ organizationId }: { organizationId?: string }) {
  const searchParams = useSearchParams()
  const params = new URLSearchParams(searchParams.toString())

  // Ensure defaults
  params.set("organizationId", organizationId ?? "")
  params.set("page", searchParams.get("page") ?? "1")
  params.set("perPage", searchParams.get("perPage") ?? "10")

  const filters = searchParams.get("filters") ? JSON.parse(searchParams.get("filters")!) : undefined
  const sort = searchParams.get("sort") ? JSON.parse(searchParams.get("sort")!) : undefined

  // Build final URL
  if (filters) params.set("filters", JSON.stringify(filters))
  else params.delete("filters")

  if (sort) params.set("sort", JSON.stringify(sort))
  else params.delete("sort")

  const url = `/api/organization/open-plays?${params.toString()}`
  const { data, isLoading, isError, error } = useOrganizationOpenPlays(url)

  if (isError) return <p>Error: {String(error)}</p>

  const columns = useMemo<ColumnDef<TOpenPlayData>[]>(
    () => [
      {
        accessorKey: "date",
        header: (props) => <DataTableColumnHeader {...props} />,
        cell: ({ row }) => (
          <div className="w-full h-full flex items-center justify-center">
            <h1 className="font-extrabold text-xl">Date</h1>
          </div>
        ),
        enableColumnFilter: false,
        meta: {
          label: "Date",
          variant: "text",
          options: [],
          exportValue: (row) => "",
          widthMode: "percent",
          widthValue: 10,
        },
      },
      {
        accessorKey: "timings",
        header: (props) => <DataTableColumnHeader {...props} />,
        cell: ({ row }) => {
          return (
            <div className="w-full h-full flex items-center justify-center">
              <h1 className="font-extrabold text-xl">Timings</h1>
            </div>
          )
        },
        enableColumnFilter: false,
        meta: {
          label: "Details",
          variant: "text",
          options: [],
          exportValue: (row) => "",
          widthMode: "autofit",
        },
      },
      {
        accessorKey: "courts",
        accessorFn: (row) => row.courts.map((c) => c),
        header: (props) => <DataTableColumnHeader {...props} />,
        cell: ({ row }) => {
          return (
            <div className="grid gap-2">
              {(row.original.courts || []).map((court, index) => (
                <Badge variant="outline" key={index}>
                  {court}
                </Badge>
              ))}
            </div>
          )
        },
        enableColumnFilter: false,
        meta: {
          label: "Courts",
          variant: "multiSelect",
          options: [],
          exportValue: (row) => row.courts.join(", "),
          widthMode: "percent",
          widthValue: 10,
        },
      },
      {
        accessorKey: "registeredPlayers",
        accessorFn: (row) => row.courts.map((c) => c),
        header: (props) => <DataTableColumnHeader {...props} />,
        cell: ({ row }) => {
          return <div className="grid gap-2">{(row.original.players || []).length} Players</div>
        },
        enableColumnFilter: false,
        meta: {
          label: "Registered Players",
          options: [],
          exportValue: (row) => row.players.length.toString(),
          widthMode: "percent",
          widthValue: 10,
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
              <h1>Open Plays</h1>
            </div>

            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              New Open Play
            </Button>
          </div>

          <DataTableV3<TOpenPlayData>
            data={data ?? []}
            columns={columns}
            isLoading={isLoading}
            features={{
              searchPlaceholder: "Search Open Plays",
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
