import { OpenPlayStatus } from "@/.config/prisma/generated/prisma"
import { isServerAuthenticated } from "@/lib/auth/auth.server"
import { BroadcastEventTypes } from "@/lib/event-broadcaster.type"
import { prisma } from "@/lib/prisma"
import { EventBroadcast } from "@/lib/server-event/broadcaster.event"
import { initializeLineup } from "@/lib/server/action/openplay.action"
import { withRateLimit } from "@/lib/server/rate-limiter"
import { manager } from "@/lib/server/services/queue-manager.service"
import { QUEUE_KEYS } from "@/lib/type/queue/queue.type"
import { NextRequest, NextResponse } from "next/server"

export const POST = withRateLimit(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await isServerAuthenticated()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    try {
      const { id } = await params

      const formData = await request.formData()
      const status = (formData.get("status") || OpenPlayStatus.pending) as OpenPlayStatus
      if (!id) return NextResponse.json({ success: false, message: "Please provide open play id!" })

      const updatedOpenPlay = await prisma.$transaction(async (tx) => {
        if (status === OpenPlayStatus.active) {
          await tx.openPlay.updateMany({
            where: {
              organizationId: session.user.organizationId,
              status: OpenPlayStatus.active,
            },
            data: {
              status: OpenPlayStatus.completed,
            },
          })
          await tx.lineupQueue.deleteMany() // Clear lineup queues
        }

        // Activate the selected Open Play
        const openPlay = await tx.openPlay.update({
          where: { id },
          data: {
            // isActive: status === OpenPlayStatus.active,
            status: status,
            isCompleted: status === OpenPlayStatus.completed,
            startedAt: status === OpenPlayStatus.active ? new Date() : null,
          },
        })

        if (status === OpenPlayStatus.completed) {
          await tx.lineupQueue.deleteMany({
            where: { openPlayId: openPlay.id },
          })
        }

        if (status === OpenPlayStatus.active || status === OpenPlayStatus.completed) {
          // safer: sequential cleanup
          for (const key of [ QUEUE_KEYS.MATCH_STARTED, QUEUE_KEYS.MATCH_ENDED, QUEUE_KEYS.MATCH_ANNOUNCEMENT, ]) {
            await manager.clearJobsByPrefix(key, `delayed_job_`)
          }

          if (status === OpenPlayStatus.active) {
            await initializeLineup(tx, openPlay.id)
          }
          EventBroadcast({
            type: BroadcastEventTypes.OPENPLAY_UPDATED,
            data: openPlay,
          })
        }
        return openPlay
      })

      return NextResponse.json({
        success: true,
        message: "Open Play activated successfully",
        data: updatedOpenPlay,
      })
    } catch (error: any) {
      console.error("Error activating open play:", error?.message || error)
      return NextResponse.json({ error: "Failed to activate Open Play" }, { status: 500 })
    }
  },
)
