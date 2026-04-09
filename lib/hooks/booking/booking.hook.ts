import { Booking } from "@/.config/prisma/generated/prisma"
import { fetcher } from "@/lib/hooks/common.hook"
import { TData } from "@/lib/type/util.type"
import { keepPreviousData, useQuery } from "@tanstack/react-query"

export type TBookedData = Booking & { bookedDate: string; courts: string[] }

export const qKeyBookings = {
  all: ["bookings"] as const,
  list: (url: string) => [...qKeyBookings.all, "list", url] as const,
}

export function useBookings(url: string) {
  const query = useQuery<TData<TBookedData>>({
    queryKey: qKeyBookings.list(url),
    queryFn: () => fetcher(url),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  })

  return {
    data: query.data?.data ?? [],
    page: query.data?.page ?? 1,
    perPage: query.data?.perPage ?? 10,
    totalCount: query.data?.totalCount ?? 0,
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
