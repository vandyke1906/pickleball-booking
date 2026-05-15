import { useQuery } from "@tanstack/react-query"

async function pingServer() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)

  const start = performance.now()

  try {
    const res = await fetch("/api/ping", {
      cache: "no-store",
      signal: controller.signal,
    })

    const duration = performance.now() - start

    if (!res.ok) throw new Error("Network error")

    const data = await res.json()

    return {
      ...data,
      latency: duration,
    }
  } finally {
    clearTimeout(timeout)
  }
}

export function useNetworkStatus() {
  const query = useQuery({
    queryKey: ["network-status"],
    queryFn: pingServer,

    refetchInterval: 8000,
    refetchIntervalInBackground: true,

    retry: 1,
    staleTime: 5000,
    refetchOnWindowFocus: true,
  })

  const browserOnline = typeof navigator !== "undefined" ? navigator.onLine : true

  const latency = query.data?.latency ?? 0
  const isOnline = browserOnline && !query.isError
  const isSlow = isOnline && query.isSuccess && latency > 1200
  const isOffline = !browserOnline || query.isError
  const quality = !isOnline ? "offline" : isSlow ? "poor" : latency < 600 ? "excellent" : "good"

  return {
    isOnline,
    isOffline,
    isSlow,
    latency,
    quality,

    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    lastChecked: query.dataUpdatedAt,
  }
}
