import { OpenPlay } from "@/.config/prisma/generated/prisma"
import { fetcher } from "@/lib/hooks/common.hook"
import { TData } from "@/lib/type/util.type"
import { keepPreviousData, useQuery } from "@tanstack/react-query"

export const qKeyOpenPlays = {
  all: ["openPlays"] as const,
  list: (organizationId?: string) =>
    [...qKeyOpenPlays.all, "list", organizationId ?? "all"] as const,
  organizationOpenPlays: (organizationId: string) =>
    [...qKeyOpenPlays.all, "organization", "list", organizationId] as const,
  detail: (id: string) => [...qKeyOpenPlays.all, "detail", id] as const,
} as const

export type TOpenPlayData = OpenPlay & { courts: string[]; players: string[] }

export function useOrganizationOpenPlays(url: string) {
  const query = useQuery<TData<TOpenPlayData>>({
    queryKey: qKeyOpenPlays.list(url),
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
