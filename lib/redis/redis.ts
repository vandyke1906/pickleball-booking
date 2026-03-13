import Redis from "ioredis"

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379"

export const redisPublisher = new Redis(redisUrl)
export const redisSubscriber = new Redis(redisUrl)

redisPublisher.on("connect", () => {
  console.info("[Redis] Publisher connected")
})
redisPublisher.on("error", (err) => {
  console.error("[Redis] Publisher error:", err)
})

redisSubscriber.on("connect", () => {
  console.info("[Redis] Subscriber connected")
})
redisSubscriber.on("error", (err) => {
  console.error("[Redis] Subscriber error:", err)
})

export const SubscriberStore = {
  async add(userId: string) {
    await redisPublisher.sadd("subscribers", userId)
  },
  async remove(userId: string) {
    await redisPublisher.srem("subscribers", userId)
  },
  async count(): Promise<number> {
    return await redisPublisher.scard("subscribers")
  },
  async all(): Promise<string[]> {
    return await redisPublisher.smembers("subscribers")
  },
}
