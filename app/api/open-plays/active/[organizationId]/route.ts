import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withRateLimit } from "@/lib/server/rate-limiter"
import { OpenPlayStatus } from "@/.config/prisma/generated/prisma"

export const GET = withRateLimit(
  async (request: NextRequest, { params }: { params: Promise<{ organizationId: string }> }) => {
    try {
      const { organizationId } = await params
      if (!organizationId)
        return NextResponse.json({ success: false, message: "Please provide organization id!" })

      const activeOpenPlay = await prisma.openPlay.findFirst({
        where: { organizationId, status: OpenPlayStatus.active },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          transitionMinutes: true,
          status: true,
          queues: {
            select: {
              player: {
                select: {
                  id: true,
                  playerName: true,
                },
              },
            },
          },
          courts: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      if (!activeOpenPlay)
        return NextResponse.json({ message: "No active Open Play found" }, { status: 404 })

      const openPlay = {
        id: activeOpenPlay.id,
        startTime: activeOpenPlay.startTime,
        endTime: activeOpenPlay.endTime,
        transitionMinutes: activeOpenPlay.transitionMinutes,
        status: activeOpenPlay.status,
        courts: activeOpenPlay.courts.map((court) => ({
          id: court.id,
          name: court.name,
        })),
        players: activeOpenPlay.queues.map((q) => ({
          id: q.player.id,
          playerName: q.player.playerName,
        })),
      }

      return NextResponse.json(openPlay)
    } catch (error: any) {
      console.error("Error getting organization's active open play:", error?.message || error)
      return NextResponse.json(
        { error: "Failed to get  organization's active open play" },
        { status: 500 },
      )
    }
  },
)
