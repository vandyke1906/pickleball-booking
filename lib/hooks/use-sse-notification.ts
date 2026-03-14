"use client"

import { useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { onSSE } from "@/lib/hooks/server-events/sse-event.dispatcher"
import { BroadcastEventTypes } from "@/lib/sse-broadcaster.type"
import { notificationKeys } from "@/lib/hooks/notification/notification.hook"
import type { NotificationData } from "@/lib/validation/notification/notification.validation"

export function useSSENotification(userId?: string) {
  const queryClient = useQueryClient()
  const audioRef = useRef<HTMLAudioElement>(null)

  // subscribe once when hook is used
  onSSE(BroadcastEventTypes.NOTIFICATION, (incoming: NotificationData) => {
    if (!userId) return

    const key = notificationKeys.todayList(userId ?? "unauthenticated")

    queryClient.setQueryData<{ data: NotificationData[] }>(key, (old) => {
      const current = old?.data ?? []
      if (current.some((n) => n.id === incoming.id)) return old
      return { data: [incoming, ...current] }
    })

    audioRef.current?.play().catch(() => {})
  })

  return { audioRef }
}
