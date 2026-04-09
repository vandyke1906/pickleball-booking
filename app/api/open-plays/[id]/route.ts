import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withRateLimit } from "@/lib/server/rate-limiter"
import { formatTimeOnly, formatToPHDateString } from "@/lib/utils"

export const GET = withRateLimit(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      if (!id) return NextResponse.json({ success: false, message: "Please provide open play id!" })

      const openPlay = await prisma.openPlay.findUnique({
        where: { id },
        select: {
          startTime: true,
          endTime: true,
          transitionMinutes: true,
          status: true,
          players: true,
          courts: {
            select: {
              name: true,
            },
          },
        },
      })

      if (!openPlay) return NextResponse.json({ message: "Open play not found" }, { status: 404 })

      const start = new Date(openPlay.startTime)
      const end = new Date(openPlay.endTime)

      const data = {
        ...openPlay,
        formatted: {
          date: formatToPHDateString(start),
          startTime: formatTimeOnly(start.toISOString()),
          endTime: formatTimeOnly(end.toISOString()),
          timeRange: `${formatTimeOnly(start.toISOString())} - ${formatTimeOnly(end.toISOString())}`,
        },
      }
      console.info(data)
      return NextResponse.json(data)
    } catch (error: any) {
      console.error("Error getting open play:", error?.message || error)
      return NextResponse.json({ error: "Failed to get open play" }, { status: 500 })
    }
  },
)
