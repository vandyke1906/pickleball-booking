import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withRateLimit } from "@/lib/server/rate-limiter"
import { formatTimeOnly, formatToPHDateString } from "@/lib/utils"
import { differenceInHours } from "date-fns"
import { isServerAuthenticated } from "@/lib/auth/auth.server"
import { OpenPlayStatus } from "@/.config/prisma/generated/prisma"

export const GET = withRateLimit(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      if (!id) return NextResponse.json({ success: false, message: "Please provide open play id!" })

      const openPlay = await prisma.openPlay.findUnique({
        where: { id },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          isActive: true,
          startedAt: true,
          transitionMinutes: true,
          announcementMinutesBeforeTransition: true,
          playerSwitchMinutes: true,
          status: true,
          players: true,
          courts: {
            select: {
              id: true,
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
          id: openPlay.id,
          playerSwitchMinutes: openPlay.playerSwitchMinutes,
          announcementMinutesBeforeTransition: openPlay.announcementMinutesBeforeTransition,
          status: openPlay.status,
          courts: openPlay.courts,
          isActive: openPlay.isActive,
          startedAt: openPlay.startedAt,
          date: formatToPHDateString(start),
          startTime: formatTimeOnly(start.toISOString()),
          endTime: formatTimeOnly(end.toISOString()),
          format24: {
            startTime: formatTimeOnly(start.toISOString(), "HH:mm"),
            endTime: formatTimeOnly(end.toISOString(), "HH:mm"),
          },
          timeRange: `${formatTimeOnly(start.toISOString())} - ${formatTimeOnly(end.toISOString())}`,
          duration: differenceInHours(end, start),
        },
      }
      return NextResponse.json(data)
    } catch (error: any) {
      console.error("Error getting open play:", error?.message || error)
      return NextResponse.json({ error: "Failed to get open play" }, { status: 500 })
    }
  },
)

// DELETE
export const DELETE = withRateLimit(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await isServerAuthenticated()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
      const { id } = await params
      if (!id) return NextResponse.json({ error: "Openplay id is required" }, { status: 400 })

      const openplay = await prisma.openPlay.findUnique({ where: { id } })
      if (!openplay) return NextResponse.json({ error: "Openplay not found" }, { status: 400 })
      if (openplay.status === OpenPlayStatus.active)
        return NextResponse.json({ error: "Openplay not is still active" }, { status: 400 })

      await prisma.openPlay.delete({ where: { id } })
      return NextResponse.json({ success: true, message: "Openplay deleted successfully" })
    } catch (err: any) {
      console.error("Delete Open Play error:", err)
      return NextResponse.json(
        { success: false, error: err.message || "Something went wrong" },
        { status: 400 },
      )
    }
  },
)
