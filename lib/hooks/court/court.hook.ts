import { Organization } from "@/.config/prisma/generated/prisma"
import { fetcher } from "@/lib/hooks/common.hook"
import { Booking, Court } from "@prisma/client"
import { useQuery } from "@tanstack/react-query"

type TBookingWithStringTime = Omit<Booking, "startTime" | "endTime"> & {
  startTime: string
  endTime: string
}

export type TCourtWithBooking = Court & {
  pricePerHour?: number
  bookings: TBookingWithStringTime[]
}

export const qKeyCourts = {
  all: ["courts"] as const,
  list: (organizationId?: string) => [...qKeyCourts.all, "list", organizationId ?? "all"] as const,
  organizationCourts: (organizationId?: string) =>
    [...qKeyCourts.all, "organization", "list", organizationId ?? "all"] as const,
  bookings: ({
    organizationId = "all",
    date = "all",
    isAll = false,
  }: {
    organizationId?: string
    date?: string
    isAll?: boolean
  }) => [...qKeyCourts.all, "bookings", organizationId, date, isAll ? "all" : "filtered"] as const,
  detail: (courtId: string) => [...qKeyCourts.all, "detail", courtId] as const,
} as const

export function useCourts({ organizationId }: { organizationId?: string } = {}) {
  const url = organizationId ? `/api/courts?organizationId=${organizationId}` : "/api/courts"

  const query = useQuery<Array<Court>>({
    queryKey: qKeyCourts.list(organizationId),
    queryFn: () => fetcher(url),
  })

  return {
    data: query.data ?? [],
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

export function useOrganizationCourts({ organizationId }: { organizationId?: string } = {}) {
  const url = organizationId
    ? `/api/organization/courts?organizationId=${organizationId}`
    : "/api/organization/courts"

  const query = useQuery<Array<Organization & { courts: Array<Court> }>>({
    queryKey: qKeyCourts.organizationCourts(organizationId),
    queryFn: () => fetcher(url),
  })

  return {
    data: query.data ?? [],
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

export function useCourtBookings({
  date,
  organizationId,
  isAll,
}: { date?: string; organizationId?: string; isAll?: boolean } = {}) {
  const params = new URLSearchParams()
  if (organizationId) params.set("organizationId", organizationId)
  if (date) params.set("date", date)
  if (isAll) params.set("all", "true")

  const url = `/api/courts/bookings${params.toString() ? `?${params.toString()}` : ""}`

  const query = useQuery<Array<TCourtWithBooking>>({
    queryKey: qKeyCourts.bookings({ organizationId, date, isAll }),
    queryFn: () => fetcher(url),
  })

  return {
    data: query.data ?? [],
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
