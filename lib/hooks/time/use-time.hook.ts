import { useQuery } from "@tanstack/react-query"
import { fetcher } from "@/lib/hooks/common.hook"

export type TServerTime = {
  now: string
  timestamp: number
  timezone: "Asia/Manila"
}

export const qKeyTime = {
  all: ["server-time"] as const,
  ph: () => [...qKeyTime.all, "ph"] as const,
}

export function usePHTime() {
  const query = useQuery<TServerTime>({
    queryKey: qKeyTime.ph(),
    queryFn: () => fetcher("/api/time"),
    staleTime: 0, // always consider fresh checkable
    gcTime: 1000 * 60 * 5, // keep for 5 minutes
    refetchInterval: 1000 * 30, // refresh every 30 seconds

    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  return {
    now: query.data?.now,
    timestamp: query.data?.timestamp,
    timezone: query.data?.timezone,

    isLoading: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
