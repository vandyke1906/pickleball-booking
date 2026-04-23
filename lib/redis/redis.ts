import Redis from "ioredis"

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379"

export const redisPublisher = new Redis(redisUrl)
export const redisSubscriber = new Redis(redisUrl)

function attachLogging(client: Redis, label: string) {
  client.on("connect", () => {
    console.info(`[Redis] ${label} connected`)
  })
  client.on("error", (err) => {
    console.error(`[Redis] ${label} error:`, err)
  })
}

attachLogging(redisPublisher, "Publisher")
attachLogging(redisSubscriber, "Subscriber")

// Wait until both clients are ready
export async function initRedis() {
  await Promise.all([
    new Promise<void>((resolve) => redisPublisher.once("ready", () => resolve())),
    new Promise<void>((resolve) => redisSubscriber.once("ready", () => resolve())),
  ])
  console.info("[Redis] Both clients initialized")
}
