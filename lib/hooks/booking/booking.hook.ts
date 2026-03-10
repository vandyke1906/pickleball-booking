import { fetcher } from "@/lib/hooks/common.hook"
import { Booking } from "@prisma/client"
import { useQuery } from "@tanstack/react-query"

export const qKeyBookings = {
  all: ["bookings"] as const,
  list: (date: string = "") => [...qKeyBookings.all, "list", date ?? "all"] as const,
}

export function useBookings({ date }: { date?: string }) {
  const url = date ? `/api/bookings?date=${date}` : "/api/bookings"

  const query = useQuery<Array<Booking>>({
    queryKey: qKeyBookings.list(date),
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
