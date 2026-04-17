import { OpenPlayStatus } from "@/.config/prisma/generated/prisma"
import { prisma } from "@/lib/prisma"
import { withRateLimit } from "@/lib/server/rate-limiter"
import { QueueManager } from "@/lib/server/services/queue-manager.service"
import { TQueueOpenPlay } from "@/lib/type/openplay/openplay.type"
import { NextRequest, NextResponse } from "next/server"

export const GET = withRateLimit(
  async (request: NextRequest, { params }: { params: Promise<{ organizationId: string }> }) => {
    try {
      const { organizationId } = await params
      if (!organizationId)
        return NextResponse.json({ success: false, message: "Please provide organization id!" })

      const activeOpenPlay = await prisma.openPlay.findFirst({
        where: { organizationId, status: OpenPlayStatus.active, isActive: true },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          isActive: true,
          isCompleted: true,
          startedAt: true,
          transitionMinutes: true,
          announcementMinutesBeforeTransition: true,
          playerSwitchMinutes: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true,
          status: true,
          queues: { select: { playerId: true, player: true } },
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

      const data: TQueueOpenPlay = {
        id: activeOpenPlay.id,
        isActive: activeOpenPlay.isActive,
        startedAt: activeOpenPlay.startedAt,
        isCompleted: activeOpenPlay.isCompleted,
        startTime: activeOpenPlay.startTime,
        endTime: activeOpenPlay.endTime,
        transitionMinutes: activeOpenPlay.transitionMinutes,
        playerSwitchMinutes: activeOpenPlay.playerSwitchMinutes,
        announcementMinutesBeforeTransition: activeOpenPlay.announcementMinutesBeforeTransition,
        status: activeOpenPlay.status,
        organizationId: activeOpenPlay.organizationId,
        createdAt: activeOpenPlay.createdAt,
        updatedAt: activeOpenPlay.updatedAt,
        queuePlayers: activeOpenPlay.queues.map((q) => ({
          id: q.playerId,
          playerName: q.player.playerName,
        })),
        courts: activeOpenPlay.courts.map((c) => ({ id: c.id, name: c.name })),
      }

      const manager = new QueueManager(data)
      const result = manager.compute(new Date())
      console.info({ result })
      return NextResponse.json(result)
    } catch (error: any) {
      console.error("Error getting open play:", error?.message || error)
      return NextResponse.json({ error: "Failed to get open play" }, { status: 500 })
    }
  },
)
