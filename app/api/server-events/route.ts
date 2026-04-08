import { isServerAuthenticated } from "@/lib/auth/auth.server"
import { EventSubscribe } from "@/lib/server-event/broadcaster.event"
import { TBroadcastEvent } from "@/lib/event-broadcaster.type"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const session = await isServerAuthenticated()
  const accountId = session?.user?.id || searchParams.get("id") || crypto.randomUUID()

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      let closed = false
      let unsubscribe: (() => void) | null = null

      const safeEnqueue = (data: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(data))
        } catch {
          cleanup()
        }
      }

      const keepAlive = setInterval(() => {
        safeEnqueue(": ping\n\n")
      }, 15000)

      const send = (event: TBroadcastEvent) => {
        const payload = JSON.stringify(event)
        safeEnqueue(`data: ${payload}\n\n`)
      }

      const cleanup = () => {
        if (closed) return
        closed = true

        clearInterval(keepAlive)
        unsubscribe?.()

        try {
          controller.close()
        } catch {}
      }

      ;(async () => {
        unsubscribe = await EventSubscribe(accountId, send)

        send({
          type: "connection",
          data: {
            status: "connected",
            time: new Date().toISOString(),
          },
        })
      })()

      // 🔴 Handle client disconnect
      request.signal.addEventListener("abort", cleanup)
    },
  })

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
