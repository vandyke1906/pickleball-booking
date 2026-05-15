import { OpenPlayStatus } from "@/.config/prisma/generated/prisma"
import { BroadcastEventTypes } from "@/lib/event-broadcaster.type"
import { prisma } from "@/lib/prisma"
import { EventBroadcast } from "@/lib/server-event/broadcaster.event"
import { deleteQueuedPlayers, getNewOpenPlaySchedules } from "@/lib/server/action/openplay.action"
import { withRateLimit } from "@/lib/server/rate-limiter"
import { manager } from "@/lib/server/services/queue-manager.service"
import { TQueuePlayer } from "@/lib/type/openplay/openplay.type"
import { QUEUE_KEYS } from "@/lib/type/queue/queue.type"
import { NextRequest, NextResponse } from "next/server"

export const GET = withRateLimit(
  async (request: NextRequest, { params }: { params: Promise<{ organizationId: string }> }) => {
    try {
      const { organizationId } = await params
      if (!organizationId)
        return NextResponse.json({ success: false, message: "Please provide organization id!" })

      const activeOpenPlay = await prisma.openPlay.findFirst({
        where: { organizationId, status: OpenPlayStatus.active },
        select: { id: true },
      })

      if (!activeOpenPlay)
        return NextResponse.json({ message: "No active Open Play found" }, { status: 404 })

      const result = await getNewOpenPlaySchedules(activeOpenPlay.id, {
        onGroupDone: async (game) => {
          try {
            const playerIds = game.players.map((p) => p.playerId)
            const result = await deleteQueuedPlayers(playerIds)
            console.info("Deleted queued players:", result.count)
            // EventBroadcast({ type: BroadcastEventTypes.OPENPLAY_UPDATED, data: activeOpenPlay })
          } catch (error) {
            console.error("Error deleting queued players:", error)
          }
        },
      })

      //Refresh batches for this open play
      // await manager.promoteWaitingPlayers<TQueuePlayer>(`batch_${activeOpenPlay.id}`, 4, {
      //   onPromoted: async (data) => {
      //     const playersHash = data
      //       .map((p: any) => p.id)
      //       .sort()
      //       .join("_")
      //     await manager.addJob(QUEUE_KEYS.ASSIGN_COURT, "assign-court", data, {
      //       jobId: `schedule_${playersHash}`,
      //       removeOnComplete: true,
      //     })
      //   },
      // })

      return NextResponse.json(result)
    } catch (error: any) {
      console.error("Error getting open play:", error?.message || error)
      return NextResponse.json({ error: "Failed to get open play" }, { status: 500 })
    }
  },
)
