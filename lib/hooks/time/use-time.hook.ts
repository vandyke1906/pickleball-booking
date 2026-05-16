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

export function useServerTime() {
  const query = useQuery<TServerTime>({
    queryKey: qKeyTime.ph(),
    queryFn: () => fetcher("/api/time"),
    staleTime: 0, // always consider fresh checkable
  })

  return {
    serverTime: query.data?.now,
    timestamp: query.data?.timestamp,
    timezone: query.data?.timezone,

    isLoading: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
