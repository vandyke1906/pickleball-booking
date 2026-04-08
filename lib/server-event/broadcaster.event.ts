import { redisPublisher, redisSubscriber, SubscriberStore } from "@/lib/redis/redis"
import { TBroadcastEvent } from "@/lib/event-broadcaster.type"
import { randomUUID } from "crypto"
import { pusher } from "@/lib/pusher"

export async function EventBroadcast<T>(event: TBroadcastEvent<T>): Promise<void> {
  const safeEvent: TBroadcastEvent<T> = {
    ...event,
    id: event.id ?? `evt_${randomUUID().slice(0, 8)}`,
    timestamp: event.timestamp ?? new Date().toISOString(),
  }

  const count = await SubscriberStore.count()
  console.info( `[Broadcast] → ${safeEvent.type} (id: ${safeEvent.id}) | subs: ${count} | pid: ${process.pid}`, )


  if (count === 0) console.warn("[Event] No active subscribers – event dropped")

  await redisPublisher.publish("events", JSON.stringify(safeEvent))
  // Also push to Pusher channel
  await pusher.trigger("booking-channel", safeEvent.type, safeEvent.data)

}

export async function EventSubscribe(
  userId: string,
  callback: (event: TBroadcastEvent<any>) => void,
): Promise<() => Promise<void>> {
  await SubscriberStore.add(userId)
  console.log(
    `[SSE] Subscribed new client – total: ${await SubscriberStore.count()}, id: ${userId}`,
  )

  // Listen for events
  redisSubscriber.on("message", (channel, message) => {
    if (channel === "events") {
      try {
        const event: TBroadcastEvent<any> = JSON.parse(message)
        callback(event)
      } catch (err) {
        console.error("[SSE] subscriber failed", err)
      }
    }
  })

  // Ensure subscription to channel
  await redisSubscriber.subscribe("events")

  return async () => {
    await SubscriberStore.remove(userId)
    console.log(`[SSE] Unsubscribed – total: ${await SubscriberStore.count()}`)
  }
}

export async function getSubscriberCount(): Promise<number> {
  return await SubscriberStore.count()
}
