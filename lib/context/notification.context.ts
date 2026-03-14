"use client"

import { NotificationsContext } from "@/lib/providers/notification-provider"
import { useContext } from "react"

export function useNotificationContext() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) {
    throw new Error("useNotificationContext must be used within a NotificationsProvider")
  }
  return ctx
}
