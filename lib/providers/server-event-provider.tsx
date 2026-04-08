"use client"

import { dispatchEvent } from "@/lib/hooks/server-events/event.dispatcher"
import { setupEventInvalidations } from "@/lib/hooks/server-events/use-event-invalidate.hook"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"

export function SSEProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const sourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const source = new EventSource(`/api/server-events?id=guest`)
    sourceRef.current = source

    source.onopen = () => {
      console.info("[SSE Client] → connected")
    }

    source.onmessage = (e) => {
      try {
        const raw = JSON.parse(e.data)

        if (raw.type && raw.data !== undefined) dispatchEvent(raw.type, raw.data)
        else console.info("[SSE] received unknown format", raw)
      } catch (err) {
        console.error("[SSE] parse error", err, e.data)
      }
    }

    source.onerror = (err) => {
      console.error("[SSE] connection error – auto-reconnect", err)
    }

    setupEventInvalidations(queryClient)

    return () => {
      source.close()
      console.info("[SSE Client] → disconnected")
    }
  }, [queryClient])

  return <>{children}</>
}
