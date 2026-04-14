"use client"

import { QueryClient } from "@tanstack/react-query"
import { BroadcastEventTypes } from "@/lib/event-broadcaster.type"
import { qKeyCourts } from "@/lib/hooks/court/court.hook"
import Pusher from "pusher-js"
import { qKeyOpenPlays } from "@/lib/hooks/open-play/open-play.hook"
import { eventBus, EventBusKeys } from "@/lib/client/event-bus"

let isSubscribed = false
//TODO events listen to pusher message
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

  channel.bind(BroadcastEventTypes.OPENPLAY_NEW_PLAYER, (data: any) => {
    queryClient.invalidateQueries({ queryKey: qKeyOpenPlays.all, exact: false })
  })

  channel.bind(BroadcastEventTypes.OPENPLAY_UPDATE_PLAYER, (data: any) => {
    queryClient.invalidateQueries({ queryKey: qKeyOpenPlays.all, exact: false })
  })

  channel.bind(BroadcastEventTypes.OPENPLAY_REMOVE_PLAYER, (data: any) => {
    queryClient.invalidateQueries({ queryKey: qKeyOpenPlays.all, exact: false })
    //call addGroupToQueue here &  Emit clean domain event
    eventBus.emit(EventBusKeys.OPENPLAY_PLAYER_ADD, {
      openPlayId: data?.openPlayId || data?.id || "",
      data,
    })
  })
}
