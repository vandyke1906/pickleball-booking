import { fetcher } from "@/lib/hooks/common.hook"
import { Court } from "@prisma/client"
import { useQuery } from "@tanstack/react-query"

export const qKeyCourts = {
  all: ["courts"] as const,
  list: (orgId?: string) => [...qKeyCourts.all, "list", orgId ?? "all"] as const,
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
