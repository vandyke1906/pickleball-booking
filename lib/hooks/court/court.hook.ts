import {
  Organization,
  OrganizationOpeningHour,
  OrganizationPricingRule,
} from "@/.config/prisma/generated/prisma"
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
  organizationCourts: (slug?: string) =>
    [...qKeyCourts.all, "organization", "list", slug ?? "all"] as const,
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

export function useOrganizationCourts({ slug }: { slug: string }) {
  // const url = slug ? `/api/organization/courts?slug=${slug}` : "/api/organization/courts"
  const url = `/api/organization/courts?slug=${slug}`

  const query = useQuery<
    Organization & {
      courts: Array<Court>
      openingHours: OrganizationOpeningHour[]
      pricingRules: OrganizationPricingRule[]
    }
  >({
    queryKey: qKeyCourts.organizationCourts(slug),
    queryFn: () => fetcher(url),
  })

  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

export function useCourtBookings({
  organizationId,
  date,
  isAll,
  enabled = false,
}: {
  organizationId: string
  date?: string
  isAll?: boolean
  enabled?: boolean
}) {
  const params = new URLSearchParams()
  params.set("organizationId", organizationId)
  if (date) params.set("date", date)
  if (isAll) params.set("all", "true")

  const url = `/api/courts/bookings${params.toString() ? `?${params.toString()}` : ""}`

  const query = useQuery<Array<TCourtWithBooking>>({
    queryKey: qKeyCourts.bookings({ organizationId, date, isAll }),
    queryFn: () => fetcher(url),
    enabled: Boolean(organizationId) && enabled,
  })

  return {
    data: query.data ?? [],
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
