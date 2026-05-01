import { initRedis } from "@/lib/redis/redis"

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.info("[Startup] Initializing Redis Connection...")
    await initRedis()
  }
}
