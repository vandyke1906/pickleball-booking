import { OpenPlayStatus } from "@/.config/prisma/generated/prisma"
import { isServerAuthenticated } from "@/lib/auth/auth.server"
import { BroadcastEventTypes } from "@/lib/event-broadcaster.type"
import { prisma } from "@/lib/prisma"
import { EventBroadcast } from "@/lib/server-event/broadcaster.event"
import { initializeLineup } from "@/lib/server/action/openplay.action"
import { withRateLimit } from "@/lib/server/rate-limiter"
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
          select: { id: true },
        })

        
          console.info("Initializing lineup for registered players...")
          const lineups = await initializeLineup(tx, openPlay.id)

        // const manager = new QueueManager(openPlay.id)
        // await manager.initializeData(tx)
        // const { scheduledGroups } = manager.initializeSchedule()
        // for (const group of scheduledGroups) {
        //   if (group) await manager.lineupQueueGroupPlayers(group, tx)
        // }

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
