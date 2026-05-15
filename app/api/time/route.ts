import { NextResponse } from "next/server"
import { withRateLimit } from "@/lib/server/rate-limiter"

export const GET = withRateLimit(async () => {
  try {
    const now = new Date()
    const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" })) // Convert to Philippine Time (UTC+8)

    return NextResponse.json({
      now: phTime.toISOString(),
      timestamp: phTime.getTime(),
      timezone: "Asia/Manila",
    })
  } catch (error) {
    console.error("Time API error:", error)

    return NextResponse.json({ error: "Failed to get PH time" }, { status: 500 })
  }
})
