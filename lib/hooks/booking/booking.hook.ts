import { fetcher } from "@/lib/hooks/common.hook"
import { useQuery } from "@tanstack/react-query"

export const qKeyBookings = {
  all: ["bookings"] as const,
  getBookings: (date: string = "") => [...qKeyBookings.all, "get", date] as const,
}

export function useFetchBookings({ date }: { date?: string }) {
  const url = date ? `/api/bookings?date=${date}` : "/api/bookings"

  const query = useQuery({
    queryKey: qKeyBookings.getBookings(date),
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
