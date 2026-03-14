import { applyRateLimit } from "@/lib/server/rate-limit.config"
import { NextRequest, NextResponse } from "next/server"

export function withRateLimit<T extends any[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>,
) {
  return async (req: NextRequest, ...args: T) => {
    try {
      const ip = req.headers.get("x-forwarded-for") || "unknown"
      await applyRateLimit(ip)
      return handler(req, ...args)
    } catch {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }
  }
}
