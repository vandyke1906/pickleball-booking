import { Court, OpenPlay, OpenPlayPlayer } from "@/.config/prisma/generated/prisma"
import { fetcher } from "@/lib/hooks/common.hook"
import { TData } from "@/lib/type/util.type"
import { keepPreviousData, useQuery } from "@tanstack/react-query"

export const qKeyOpenPlays = {
  all: ["openPlays"] as const,
  list: (params: {
    organizationId?: string
    page?: string
    perPage?: string
    filters?: string
    sort?: string
  }) =>
    [
      "openPlays",
      "list",
      params.organizationId ?? "all",
      params.page ?? "1",
      params.perPage ?? "10",
      params.filters ?? "",
      params.sort ?? "",
    ] as const,
  organizationOpenPlays: (organizationId: string) =>
    [...qKeyOpenPlays.all, "organization", "list", organizationId] as const,
  detail: (id: string) => [...qKeyOpenPlays.all, "detail", id] as const,
} as const

export type TOpenPlayData = OpenPlay & { courts: string[]; players: string[] }

type OpenPlayListParams = {
  organizationId?: string
  page?: string
  perPage?: string
  filters?: string
  sort?: string
}

export type TOpenPlay = OpenPlay & {
  formatted: {
    date: string
    startTime: string
    endTime: string
    timeRange: string
  }
  courts: Court[]
  players: OpenPlayPlayer[]
}

export function useOrganizationOpenPlays(params: OpenPlayListParams) {
  const query = useQuery<TData<TOpenPlayData>>({
    queryKey: qKeyOpenPlays.list(params),
    queryFn: () => {
      const url = new URL("/api/organization/open-plays", window.location.origin)
      if (params.organizationId) url.searchParams.set("organizationId", params.organizationId)
      if (params.page) url.searchParams.set("page", params.page)
      if (params.perPage) url.searchParams.set("perPage", params.perPage)
      if (params.filters) url.searchParams.set("filters", params.filters)
      if (params.sort) url.searchParams.set("sort", params.sort)
      console.info(url.toString())
      return fetcher(url.toString())
    },
    enabled: !!params.organizationId,
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

export function useOpenPlay(id: string) {
  const url = `/api/open-plays/${id}`

  const query = useQuery<TOpenPlay>({
    queryKey: qKeyOpenPlays.detail(id),
    queryFn: () => fetcher(url),
    enabled: typeof id === "string" && id.trim().length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // still 30 minutes is fine
  })

  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
