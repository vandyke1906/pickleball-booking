import { OpenPlayStatus } from "@/.config/prisma/generated/prisma"
import { BroadcastEventTypes } from "@/lib/event-broadcaster.type"
import { prisma } from "@/lib/prisma"
import { EventBroadcast } from "@/lib/server-event/broadcaster.event"
import { withRateLimit } from "@/lib/server/rate-limiter"
import { NextRequest, NextResponse } from "next/server"

export const POST = withRateLimit(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      if (!id) return NextResponse.json({ success: false, message: "Please provide open play id!" })

      const updatedOpenPlay = await prisma.$transaction(async (tx) => {
        // Activate the selected Open Play
        const openPlay = await tx.openPlay.update({
          where: { id },
          data: {
            status: OpenPlayStatus.completed,
            isCompleted: true,
          },
        })

        await tx.lineupQueue.deleteMany({
          where: { openPlayId: openPlay.id },
        })

        EventBroadcast({
          type: BroadcastEventTypes.OPENPLAY_UPDATED,
          data: openPlay,
        })
        return openPlay
      })

      return NextResponse.json({
        success: true,
        message: "Open Play completed successfully",
        data: updatedOpenPlay,
      })
    } catch (error: any) {
      console.error("Error completing open play:", error?.message || error)
      return NextResponse.json({ error: "Failed to complete Open Play" }, { status: 500 })
    }
  },
)
