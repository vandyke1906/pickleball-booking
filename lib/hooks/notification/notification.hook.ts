import { fetcher } from "@/lib/hooks/common.hook"
import { getUserTodayAndUnreadNotifications } from "@/lib/server/action/notification.action"
import { useQuery } from "@tanstack/react-query"

export type TNotification = Notification

export const notificationKeys = {
  all: ["notification"] as const,
  markAsRead: (userId: string) => [...notificationKeys.all, "mark-as-read", userId] as const,
  todayList: (userId: string) => [...notificationKeys.all, "today", userId] as const,
  list: (includesKey: string) => [...notificationKeys.all, includesKey] as const,
}

export function useNotifications(options?: { enabled?: boolean; includes: String[] }) {
  const { enabled = true, includes = [] } = options ?? {}

  const apiPath = `/api/notifications`
  const params = new URLSearchParams()
  if (includes.length > 0) params.set("include", includes.join(","))
  const url = enabled ? `${apiPath}?${params.toString()}` : ""

  const includesKey = [...includes].sort().join(",")
  const query = useQuery<{ data: TNotification[] }>({
    queryKey: notificationKeys.list(includesKey),
    queryFn: () => fetcher(url),
    enabled,
  })

  return {
    data: query.data?.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

export function useTodayAndUnreadNotifications(userId: string) {
  const query = useQuery<{ data: TNotification[] }>({
    queryKey: notificationKeys.todayList(userId ?? "unauthenticated"),
    queryFn: async (): Promise<{ data: TNotification[] }> => {
      const result = await getUserTodayAndUnreadNotifications()
      return { data: result ?? [] }
    },
    enabled: Boolean(userId),
  })

  return {
    data: query.data?.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
