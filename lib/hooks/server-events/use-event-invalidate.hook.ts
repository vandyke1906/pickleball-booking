"use client"

import { QueryClient } from "@tanstack/react-query"
import { BroadcastEventTypes } from "@/lib/event-broadcaster.type"
import { qKeyCourts } from "@/lib/hooks/court/court.hook"
import Pusher from "pusher-js"

let isSubscribed = false

export function setupEventInvalidations(queryClient: QueryClient) {
  if (isSubscribed) return
  isSubscribed = true
  
  // Initialize Pusher client
  const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  })

  // Subscribe to your channel
  const channel = pusher.subscribe("booking-channel")

  // Listen for booking created events
  channel.bind(BroadcastEventTypes.BOOKING_CREATED, (data: any) => {
    queryClient.invalidateQueries({ queryKey: qKeyCourts.all, exact: false })
  })

  channel.bind(BroadcastEventTypes.BOOKING_CANCELLED, (data: any) => {
    queryClient.invalidateQueries({ queryKey: qKeyCourts.all, exact: false })
  })

}
