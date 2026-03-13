import { EventSubscribe } from "@/lib/server-event/broadcaster.event"
import { TBroadcastEvent } from "@/lib/sse-broadcaster.type"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const browserId = searchParams.get("browserId") || crypto.randomUUID()

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"))
      }, 15000)

      const send = (event: TBroadcastEvent) => {
        console.info("Event received in send:", event)
        try {
          const payload = JSON.stringify(event)
          const message = `data: ${payload}\n\n`
          controller.enqueue(encoder.encode(message))
          console.info(`[SSE SERVER → CLIENT] sent: ${event.type}`)
        } catch (err) {
          console.error("[SSE] failed to send event", err)
        }
      }

      // Run async subscription inside a promise
      ;(async () => {
        const unsubscribe = await EventSubscribe(browserId, send)

        send({
          type: "connection",
          data: { status: "connected", time: new Date().toISOString() },
        })

        const cleanup = () => {
          unsubscribe()
          clearInterval(keepAlive)
          controller.close()
        }

        request.signal.addEventListener("abort", cleanup)

        // Handle controller errors
        controller.error = (err: any) => {
          console.error("[SSE] controller.error triggered", err)
          cleanup()
        }
      })()
    },
  })

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Helps nginx / some proxies
    },
  })
}
