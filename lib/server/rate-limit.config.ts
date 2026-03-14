import { RateLimiterRedis } from "rate-limiter-flexible"
import Redis from "ioredis"

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379"
const redisClient = new Redis(redisUrl)

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  points: parseInt(process.env.RATE_LIMIT_POINTS ?? "100", 10), // 100 requests
  duration: parseInt(process.env.RATE_LIMIT_DURATION ?? "60", 10), // per 60 seconds
})

export async function applyRateLimit(ip: string) {
  await rateLimiter.consume(ip)
}
