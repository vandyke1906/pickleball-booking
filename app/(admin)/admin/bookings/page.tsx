"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { Booking, Court } from "@prisma/client"
import { useSession } from "next-auth/react"
import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { LandPlot } from "lucide-react"
import { DataTableV3 } from "@/components/data-table/data-table.v3"
import { formatDate, formatFloat } from "@/lib/utils"
import { TBookedData, useBookings } from "@/lib/hooks/booking/booking.hook"
import { Badge } from "@/components/ui/badge"
import BadgeStatus, { ReadableStatus, TStatus } from "@/components/common/badge-status"

export default function BookingsPage() {
  const { data: session } = useSession()
  const { data, isLoading } = useBookings({})

  const { courtOptions, statusOptions } = useMemo(() => {
    if (!data?.length) return { courtOptions: [], statusOptions: [] }
    const courtMap = new Map()
    const statusMap = new Map()

    for (const item of data) {
      if (!statusMap.has(item.status))
        statusMap.set(item.status, {
          value: item.status,
          label: ReadableStatus(item.status as TStatus),
        })

      for (const court of item.courts) {
        if (!courtMap.has(court))
          courtMap.set(court, {
            value: court,
            label: court,
          })
      }
    }

    return {
      courtOptions: Array.from(courtMap.values()),
      statusOptions: Array.from(statusMap.values()),
    }
  }, [data])

  const columns = useMemo<ColumnDef<TBookedData>[]>(
    () => [
      {
        accessorKey: "code",
        header: (props) => <DataTableColumnHeader {...props} />,
        cell: ({ row }) => (
          <div className="w-full h-full flex items-center justify-center">
            <h1 className="font-extrabold text-xl">{row.original.code}</h1>
          </div>
        ),
        meta: {
          label: "Booking Code",
          variant: "text",
          options: [],
          exportValue: (row) => row.code ?? "",
          widthMode: "percent",
          widthValue: 10,
        },
      },
      {
        accessorKey: "fullName",
        header: (props) => <DataTableColumnHeader {...props} />,
        cell: ({ row }) => {
          return (
            <div>
              <div className="flex flex-col gap-0.5 py-1 leading-tight font-semibold">
                <span>{row.original.fullName ?? ""}</span>
              </div>
              <div className="text-primary font-medium">
                <span>{row.original.contactNumber}</span>
                <span>{row.original.emailAddress}</span>
              </div>
              <div className="flex gap-2 text-primary font-medium">
                <span>{row.original.bookedDate}</span>
                <span>
                  {row.original.startTime} - {row.original.endTime}
                </span>
              </div>

              <div className="text-primary font-medium">
                <span className="text-muted-foreground">Total Price: </span>
                <span>{formatFloat(row.original.totalPrice ?? 0)}</span>
              </div>
            </div>
          )
        },
        meta: {
          label: "Details",
          variant: "text",
          options: [],
          exportValue: (row) => row.code ?? "",
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
        accessorKey: "totalPrice",
        header: (props) => <DataTableColumnHeader {...props} />,
        cell: ({ row }) => (
          <div className="w-full text-right">{formatFloat(row.original?.totalPrice ?? 0)}</div>
        ),
        meta: {
          label: "Total",
          variant: "text",
          options: [],
          exportValue: (row) => formatFloat(row.totalPrice ?? 0),
          widthMode: "percent",
          widthValue: 5,
        },
      },

      {
        accessorKey: "status",
        header: (props) => <DataTableColumnHeader {...props} />,
        cell: ({ row }) => {
          return (
            <div className="w-full h-full flex items-center justify-center">
              <BadgeStatus status={row.original.status as TStatus} />
            </div>
          )
        },
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
        accessorKey: "createdAt",
        accessorFn: (row) => row.courts.map((c) => c),
        header: (props) => <DataTableColumnHeader {...props} />,
        cell: ({ row }) =>
          formatDate(row.original.createdAt, {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }),
        meta: {
          label: "Courts",
          variant: "dateRange",
          options: [],
          exportValue: (row) => row.createdAt.toLocaleString(),
          widthMode: "percent",
          widthValue: 15,
        },
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <LandPlot className="h-6 w-6 text-primary" />
              <h1>Courts</h1>
            </div>
          </div>

          <DataTableV3<TBookedData>
            data={data ?? []}
            columns={columns}
            dynamicFilterOptions={{
              courts: courtOptions,
              status: statusOptions,
            }}
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
