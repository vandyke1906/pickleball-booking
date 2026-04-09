import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withRateLimit } from "@/lib/server/rate-limiter"

export const GET = withRateLimit(async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organizationId")
    if (!organizationId) throw new Error("Organization required")

    const data = await prisma.openPlay.findMany({
      where: { organizationId },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        courts: true,
        players: true,
      },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching open plays:", error)
    return NextResponse.json({ error: "Failed to fetch open plays" }, { status: 500 })
  }
})
