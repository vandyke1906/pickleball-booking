import { OpenPlayStatus, QueueStatus } from "@/.config/prisma/generated/prisma"
import { BroadcastEventTypes } from "@/lib/event-broadcaster.type"
import { prisma } from "@/lib/prisma"
import { EventBroadcast } from "@/lib/server-event/broadcaster.event"
import { createLineupEntries } from "@/lib/server/action/openplay.action"
import { withRateLimit } from "@/lib/server/rate-limiter"
import { QueueManager } from "@/lib/server/services/queue-manager.v1.service"
import { NextRequest, NextResponse } from "next/server"

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const formData = await req.formData()
    const openPlayId = formData.get("openPlayId") as string
    const code = formData.get("code") as string

    if (!openPlayId || !code) throw new Error("Missing required fields")

    const result = await prisma.$transaction(async (tx) => {
      // Find player
      const openPlayPlayer = await tx.openPlayPlayer.findUnique({
        where: {
          openPlayId_code: {
            openPlayId,
            code: code.trim(),
          },
        },
        include: {
          openPlay: {
            select: {
              id: true,
              status: true,
              endTime: true,
            },
          },
        },
      })

      if (!openPlayPlayer) throw new Error("Invalid code or open play session")
      if (openPlayPlayer?.openPlay?.status !== OpenPlayStatus.active)
        throw new Error("Your session is not active")

      // Check session time
      const now = new Date()
      if (now > openPlayPlayer.openPlay.endTime)
        throw new Error("Open Play session has already ended")
      if (openPlayPlayer.endAt && now > openPlayPlayer.endAt)
        throw new Error("Your session has already ended")

      // Prevent duplicate queue entry
      const existing = await tx.lineupQueue.findFirst({
        where: {
          playerId: openPlayPlayer.id,
          status: QueueStatus.waiting,
        },
      })

      if (existing) throw new Error("You are already in the queue")
      await createLineupEntries(tx, [openPlayPlayer])

      const manager = new QueueManager(openPlayId)
      await manager.scheduleWaitingPlayers(tx)

      //update ui of all clients on openplay
      EventBroadcast({
        type: BroadcastEventTypes.OPENPLAY_UPDATED,
        data: openPlayPlayer?.openPlay,
      })

      return openPlayPlayer
    })

    return NextResponse.json({
      success: true,
      message: "Lineup submitted successfully",
      result,
    })
  } catch (err: any) {
    console.error("Lineup submission error:", err)

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to submit lineup",
      },
      { status: 400 },
    )
  }
})
