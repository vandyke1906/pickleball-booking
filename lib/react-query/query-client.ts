import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // data is immediately stale
      gcTime: 0, // no caching, query results discarded right away
      refetchOnWindowFocus: true,
      refetchOnReconnect: false,
      retry: false,
    },
  },
})
