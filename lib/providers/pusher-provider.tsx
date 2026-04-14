"use client"

import Pusher from "pusher-js"
import { dispatchEvent } from "@/lib/hooks/server-events/event.dispatcher"
import { setupEventInvalidations } from "@/lib/hooks/server-events/use-event-invalidate.hook"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { BroadcastEventTypes } from "@/lib/event-broadcaster.type"

export function PusherProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const pusherRef = useRef<Pusher | null>(null)

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
    pusherRef.current = pusher

    const channel = pusher.subscribe("booking-channel")

    // Bind all known broadcast events
    Object.values(BroadcastEventTypes).forEach((eventType) => {
      channel.bind(eventType, (data: any) => {
        try {
          dispatchEvent(eventType, data)
        } catch (err) {
          console.error(`[Pusher] error handling ${eventType}`, err, data)
        }
      })
    })

    channel.bind_global((eventName: string, data: any) => {
      console.info("[Pusher] received event", eventName, data)
    })

    setupEventInvalidations(queryClient)

    console.info("[Client] → connected")

    return () => {
      channel.unbind_all()
      channel.unsubscribe()
      pusher.disconnect()
      console.info("[Client] → disconnected")
    }
  }, [queryClient])

  return <>{children}</>
}
