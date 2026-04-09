"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { HandFist, LandPlot, Plus } from "lucide-react"
import { DataTableV3 } from "@/components/data-table/data-table.v3"
import { useSearchParams } from "next/navigation"
import { TOpenPlayData, useOrganizationOpenPlays } from "@/lib/hooks/open-play/open-play.hook"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import OpenPlayDialog from "@/app/(admin)/admin/(component)/open-play-dialog"
import { useSession } from "next-auth/react"
import { formatDateString, formatTimeRange } from "@/lib/utils"

export default function OpenPlaysList() {
  const { data: session } = useSession()

  const organizationId = session?.user?.organizationId
  const searchParams = useSearchParams()

  const params = useMemo(
    () => ({
      organizationId,
      page: searchParams.get("page") ?? "1",
      perPage: searchParams.get("perPage") ?? "",
      filters: searchParams.get("filters") ?? "",
      sort: searchParams.get("sort") ?? "",
    }),
    [searchParams, organizationId],
  )

  const { data, totalCount, perPage, isLoading, isError, error } = useOrganizationOpenPlays(params)
  const [openNewOpenPlayDialog, setOpenNewOpenPlayDialog] = useState(false)

  const columns = useMemo<ColumnDef<TOpenPlayData>[]>(
    () => [
      {
        accessorKey: "startTime",
        header: (props) => <DataTableColumnHeader {...props} />,
        cell: ({ row }) => (
          <div className="w-full h-full flex items-center justify-center">
            {formatDateString(row.original.startTime.toLocaleString("default", { month: "short" }))}
          </div>
        ),
        enableColumnFilter: false,
        meta: {
          label: "Date",
          variant: "text",
          options: [],
          exportValue: (row) => {
            formatDateString(row.startTime.toLocaleString("default", { month: "short" }))
          },
          widthMode: "autofit",
        },
      },
      {
        accessorKey: "timings",
        enableColumnFilter: false,
        enableSorting: false,
        header: (props) => <DataTableColumnHeader {...props} />,
        cell: ({ row }) => {
          return (
            <div className="w-full h-full flex items-center justify-center">
              {formatTimeRange(row.original.startTime, row.original.endTime)}
            </div>
          )
        },
        meta: {
          label: "Timings",
          variant: "text",
          options: [],
          exportValue: (row) => formatTimeRange(row.startTime, row.endTime),
          widthMode: "percent",
          widthValue: 20,
        },
      },
      {
        accessorKey: "courts",
        enableColumnFilter: false,
        enableSorting: false,
        accessorFn: (row) => row.courts.map((c) => c),
        header: (props) => <DataTableColumnHeader {...props} />,
        cell: ({ row }) => {
          return (
            <div className="grid gap-2">
              {(row.original.courts || []).map((court: any) => (
                <Badge variant="default" key={court.id}>
                  {court.name}
                </Badge>
              ))}
            </div>
          )
        },
        meta: {
          label: "Courts",
          variant: "multiSelect",
          options: [],
          exportValue: (row) => row.courts.map((c: any) => c.name).join(", "),
          widthMode: "percent",
          widthValue: 30,
        },
      },
      {
        accessorKey: "registeredPlayers",
        enableColumnFilter: false,
        enableSorting: false,
        accessorFn: (row) => row.courts.map((c) => c),
        header: (props) => <DataTableColumnHeader {...props} />,
        cell: ({ row }) => {
          return <div className="grid gap-2">{(row.original.players || []).length} Players</div>
        },
        meta: {
          label: "Registered Players",
          options: [],
          exportValue: (row) => row.players.length.toString(),
          widthMode: "percent",
          widthValue: 8,
        },
      },
    ],
    [data],
  )

  if (isError) return <p>Error: {String(error)}</p>

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <HandFist className="h-6 w-6 text-primary" />
              <h1>Open Plays</h1>
            </div>

            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                setOpenNewOpenPlayDialog(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Open Play
            </Button>
          </div>

          <DataTableV3<TOpenPlayData>
            data={data ?? []}
            columns={columns}
            isLoading={isLoading}
            features={{
              searchPlaceholder: "Search Open Plays...",
              showSearch: true,
              showExport: true,
              showViewOptions: true,
              height: "auto",
            }}
            config={{
              manualPagination: true,
              totalCount: totalCount,
              pageCount: Math.ceil(totalCount / perPage),
            }}
          />
        </CardContent>
      </Card>

      <OpenPlayDialog open={openNewOpenPlayDialog} onOpenChange={setOpenNewOpenPlayDialog} />
    </div>
  )
}
