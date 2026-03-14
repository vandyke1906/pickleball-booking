"use client"

import { useRef, useMemo, useCallback, useEffect } from "react"
import { createContext, ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  notificationKeys,
  useTodayAndUnreadNotifications,
} from "../hooks/notification/notification.hook"
import { NotificationData } from "@/lib/validation/notification/notification.validation"
import { useSession } from "next-auth/react"
import {
  useMutateMarkAsReadNotification,
  useMutateMarkAllAsReadNotification,
} from "@/lib/mutations/notification/notification.mutation"
import { useSSENotification } from "@/lib/hooks/use-sse-notification"

// ────────────────────────────────────────────────
// Context Type (unchanged, but kept explicit)
export type NotificationsContextType = {
  notifications: NotificationData[]
  loading: boolean
  pushNotification: (n: Omit<NotificationData, "createdAt" | "isRead">) => void
  markAsRead: (id: string) => Promise<void>
  clearAll: () => Promise<void>
}

export const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

// ────────────────────────────────────────────────
// Provider – Modern React Query + Optimistic + Real-time
// ────────────────────────────────────────────────
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const userId = session?.user?.id ?? null // null instead of "" – more semantic

  const queryClient = useQueryClient()
  // Attach SSE subscription here
  const { audioRef } = useSSENotification(userId ?? "unauthenticated")

  // Main data source – today's + unread notifications
  const { data: notifications = [], isLoading: loading } = useTodayAndUnreadNotifications(
    userId ?? "unauthenticated",
  )

  // Mutations (you already have them – we use them here)
  const markAsReadMutation = useMutateMarkAsReadNotification()
  const clearAllMutation = useMutateMarkAllAsReadNotification()

  // ────────────────────────────────────────────────
  // Actions – optimistic + server sync
  // ────────────────────────────────────────────────
  const pushNotification = useCallback(
    (payload: Omit<NotificationData, "createdAt" | "isRead">) => {
      const optimistic: NotificationData = {
        ...payload,
        createdAt: new Date().toISOString(),
        isRead: false,
      }

      const key = notificationKeys.todayList(userId ?? "unauthenticated")

      queryClient.setQueryData<{ data: NotificationData[] }>(key, (old) => ({
        data: [optimistic, ...(old?.data ?? [])],
      }))
    },
    [queryClient, userId],
  )

  const markAsRead = useCallback(
    async (id: string) => {
      const key = notificationKeys.todayList(userId ?? "unauthenticated")

      // 1. Optimistic update
      queryClient.setQueryData<{ data: NotificationData[] }>(key, (old) => ({
        data: old?.data.map((n) => (n.id === id ? { ...n, isRead: true } : n)) ?? [],
      }))

      try {
        await markAsReadMutation.mutateAsync({ id })
      } catch (err) {
        console.error("[Notifications] markAsRead failed", err)
      }
    },
    [queryClient, userId, markAsReadMutation],
  )

  const clearAll = useCallback(async () => {
    if (!userId) return

    const key = notificationKeys.todayList(userId ?? "unauthenticated")

    // 1. Optimistic clear
    queryClient.setQueryData(key, { data: [] })

    try {
      await clearAllMutation.mutateAsync()
    } catch (err) {
      console.error("[Notifications] clearAll failed", err)
      // Rollback handled in mutation
    }
  }, [queryClient, userId, clearAllMutation])

  // Final stable context value
  const value = useMemo<NotificationsContextType>(
    () => ({
      notifications,
      loading: loading || clearAllMutation.isPending,
      pushNotification,
      markAsRead,
      clearAll,
    }),
    [notifications, loading, pushNotification, markAsRead, clearAll],
  )

  return (
    <NotificationsContext.Provider value={value}>
      <audio ref={audioRef} src="/audio/notification.mp3" preload="auto" />
      {children}
    </NotificationsContext.Provider>
  )
}
