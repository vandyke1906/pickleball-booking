import { OpenPlayStatus, QueueStatus } from "@/.config/prisma/generated/prisma"
import { isServerAuthenticated } from "@/lib/auth/auth.server"
import { BroadcastEventTypes } from "@/lib/event-broadcaster.type"
import { prisma } from "@/lib/prisma"
import { EventBroadcast } from "@/lib/server-event/broadcaster.event"
import { withRateLimit } from "@/lib/server/rate-limiter"
import { QueueManager } from "@/lib/server/services/queue-manager.service"
import { TQueueOpenPlay } from "@/lib/type/openplay/openplay.type"
import { NextRequest, NextResponse } from "next/server"

export const POST = withRateLimit(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await isServerAuthenticated()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    try {
      const { id } = await params
      if (!id) return NextResponse.json({ success: false, message: "Please provide open play id!" })
      const openPlay = await prisma.openPlay.findUnique({
        where: { id, status: OpenPlayStatus.active, isActive: true },
      })
      if (!openPlay)
        return NextResponse.json({ success: false, message: "Active open play not found!" })

      const startedOpenPlay = await prisma.$transaction(async (tx) => {
        // Activate the selected Open Play
        const openPlay = await tx.openPlay.update({
          where: { id },
          data: {
            startedAt: new Date(),
          },
          select: {
            id: true,
            startTime: true,
            endTime: true,
            isActive: true,
            isCompleted: true,
            startedAt: true,
            transitionMinutes: true,
            announcementMinutesBeforeTransition: true,
            preparationSeconds: true,
            organizationId: true,
            createdAt: true,
            updatedAt: true,
            status: true,
            queues: { select: { id: true, playerId: true, player: true, scheduledAt: true } },
            courts: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })

        const data: TQueueOpenPlay = {
          id: openPlay.id,
          isActive: openPlay.isActive,
          startedAt: openPlay.startedAt,
          isCompleted: openPlay.isCompleted,
          startTime: openPlay.startTime,
          endTime: openPlay.endTime,
          transitionMinutes: openPlay.transitionMinutes,
          preparationSeconds: openPlay.preparationSeconds,
          announcementMinutesBeforeTransition: openPlay.announcementMinutesBeforeTransition,
          status: openPlay.status,
          organizationId: openPlay.organizationId,
          createdAt: openPlay.createdAt,
          updatedAt: openPlay.updatedAt,
          queuePlayers: openPlay.queues.map((q) => ({
            id: q.id,
            playerId: q.playerId,
            playerName: q.player.playerName,
            scheduledAt: q.scheduledAt,
          })),
          courts: openPlay.courts.map((c) => ({ id: c.id, name: c.name })),
        }

        const groups = new QueueManager(data).initialize()
        for (const group of groups) {
          for (const player of group.players) {
            await tx.lineupQueue.upsert({
              where: {
                playerId_openPlayId: { playerId: player.playerId, openPlayId: openPlay.id },
              },
              update: { scheduledAt: group.scheduledAt, status: QueueStatus.waiting },
              create: {
                playerId: player.id,
                openPlayId: openPlay.id,
                scheduledAt: group.scheduledAt,
                status: QueueStatus.waiting,
              },
            })
          }
        }

        //update ui of all clients on openplay
        EventBroadcast({
          type: BroadcastEventTypes.OPENPLAY_UPDATED,
          data: openPlay,
        })

        return openPlay
      })

      return NextResponse.json({
        success: true,
        message: "Open Play started successfully",
        data: startedOpenPlay,
      })
    } catch (error: any) {
      console.error("Error starting open play:", error?.message || error)
      return NextResponse.json({ error: "Failed to start Open Play" }, { status: 500 })
    }
  },
)
