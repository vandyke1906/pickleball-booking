"use client"

import { QueryClient } from "@tanstack/react-query"
import { onSSE } from "@/lib/hooks/server-events/sse-event.dispatcher"
import { BroadcastEventTypes } from "@/lib/sse-broadcaster.type"
import { qKeyCourts } from "@/lib/hooks/court/court.hook"

let isSubscribed = false

export function setupServerEventInvalidations(queryClient: QueryClient) {
  if (isSubscribed) return
  isSubscribed = true

  // TODO register react queries here - Progress updates → invalidate related queries
  onSSE(BroadcastEventTypes.BOOKING_CREATED, (data: any) => {
    queryClient.invalidateQueries({ queryKey: qKeyCourts.all, exact: false })
  })
}
