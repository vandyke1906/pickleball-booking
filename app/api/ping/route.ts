import { NextRequest, NextResponse } from "next/server"
import { withRateLimit } from "@/lib/server/rate-limiter"

export const GET = withRateLimit(async (request: NextRequest) => {
  try {
    return NextResponse.json(
      {
        ok: true,
        timestamp: Date.now(),
        version: "1.0",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    )
  } catch (error) {
    console.error("Ping endpoint error:", error)

    return NextResponse.json(
      {
        ok: false,
        error: "Ping failed",
        timestamp: Date.now(),
      },
      { status: 500 },
    )
  }
})
