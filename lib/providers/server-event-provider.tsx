"use client"

import { dispatchSSEEvent } from "@/lib/hooks/server-events/sse-event.dispatcher"
import { setupServerEventInvalidations } from "@/lib/hooks/server-events/use-sse-invalidate.hook"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

export function SSEProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  let browserId = localStorage.getItem("browserId")
  if (!browserId) {
    browserId = crypto.randomUUID()
    localStorage.setItem("browserId", browserId)
  }

  useEffect(() => {
    const source = new EventSource("/api/server-events?browserId=${browserId}")

    source.onopen = () => {
      console.info("[SSE Client] → connected")
    }

    // This receives ALL events
    source.onmessage = (e) => {
      try {
        const raw = JSON.parse(e.data)
        if (raw.type && raw.data !== undefined) dispatchSSEEvent(raw.type, raw.data)
        else console.info("[SSE] received unknown format", raw)
      } catch (err) {
        console.error("[SSE] parse error", err, e.data)
      }
    }

    source.onerror = (err) => {
      console.error("[SSE] connection error – will auto-reconnect", err)
    }

    setupServerEventInvalidations(queryClient) //Setup React Query invalidations once

    return () => {
      source.close()
      console.info("[SSE Client] → disconnected")
    }
  }, [])

  return <>{children}</>
}
