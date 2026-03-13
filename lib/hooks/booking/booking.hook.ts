import { fetcher } from "@/lib/hooks/common.hook"
import { Booking } from "@prisma/client"
import { useQuery } from "@tanstack/react-query"

type Filter = {
  id: string
  value: any[]
  variant: string
  operator: string
  filterId?: string
}

type Sort = {
  id: string
  desc: boolean
}

interface UseBookingsParams {
  date?: string
  page?: number
  perPage?: number
  filters?: Filter[]
  sort?: Sort[]
}

export type TBookedData = Booking & { bookedDate: string; courts: string[] }

export const qKeyBookings = {
  all: ["bookings"] as const,
  list: (url: string) => [...qKeyBookings.all, "list", url] as const,
}

export function useBookings(url: string) {
  const query = useQuery<{
    page: number
    perPage: number
    totalCount: number
    data: Array<TBookedData>
  }>({
    queryKey: qKeyBookings.list(url),
    queryFn: () => fetcher(url),
    keepPreviousData: true,
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
