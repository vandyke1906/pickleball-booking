import { RateLimiterRedis } from "rate-limiter-flexible"
import Redis from "ioredis"

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379"
const redisClient = new Redis(redisUrl)

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  points: 100, // 100 requests
  duration: 60, // per 60 seconds
})

export async function applyRateLimit(ip: string) {
  await rateLimiter.consume(ip)
}
