import { OpenPlayStatus } from "@/.config/prisma/generated/prisma"
import { prisma } from "@/lib/prisma"
import { deleteQueuedPlayers } from "@/lib/server/action/openplay.action"
import { withRateLimit } from "@/lib/server/rate-limiter"
import { QueueManager } from "@/lib/server/services/queue-manager.service"
import { NextRequest, NextResponse } from "next/server"

export const GET = withRateLimit(
  async (request: NextRequest, { params }: { params: Promise<{ organizationId: string }> }) => {
    try {
      const { organizationId } = await params
      if (!organizationId)
        return NextResponse.json({ success: false, message: "Please provide organization id!" })

      const activeOpenPlay = await prisma.openPlay.findFirst({
        where: { organizationId, status: OpenPlayStatus.active, isActive: true },
        select: { id: true }, })

      if (!activeOpenPlay)
        return NextResponse.json({ message: "No active Open Play found" }, { status: 404 })

      const manager = new QueueManager(activeOpenPlay.id)
      await manager.initializeData()
      const result = manager.compute({
        now: new Date(),
        onGroupDone: (game) => {
          console.log(`Group finished on court ${game.courtName}`)
          console.info(JSON.stringify(game, null, 2))
          const playerIds = game.players.map((p) => p.playerId)
          //RONIE DELETE done groups
          deleteQueuedPlayers(playerIds)
            .then((result) => {
              console.info("Deleted queued players:", result.count)
            })
            .catch((error) => {
              console.error("Error deleting queued players:", error)
            })
        },
        onPlayerDone: (player) => {
          // console.log(`Player ${player.playerName} finished`))
        },
      })
      return NextResponse.json(result)
    } catch (error: any) {
      console.error(error)
      console.error("Error getting open play:", error?.message || error)
      return NextResponse.json({ error: "Failed to get open play" }, { status: 500 })
    }
  },
)
