import { OpenPlayStatus } from "@/.config/prisma/generated/prisma"
import { isServerAuthenticated } from "@/lib/auth/auth.server"
import { prisma } from "@/lib/prisma"
import { initializeLineup } from "@/lib/server/action/openplay.action"
import { withRateLimit } from "@/lib/server/rate-limiter"
import { NextRequest, NextResponse } from "next/server"

export const POST = withRateLimit(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await isServerAuthenticated()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    try {
      const { id } = await params

      const formData = await request.formData()
      const status = formData.get("status") as OpenPlayStatus
      if (!id) return NextResponse.json({ success: false, message: "Please provide open play id!" })

      const updatedOpenPlay = await prisma.$transaction(async (tx) => {
        if (status === OpenPlayStatus.active) {
          // Complete any currently active Open Play
          await tx.openPlay.updateMany({
            where: {
              organizationId: session.user.organizationId,
              status: OpenPlayStatus.active,
            },
            data: {
              isActive: false,
              status: OpenPlayStatus.completed,
            },
          })

          // Clear lineup queues for completed sessions
          await tx.lineupQueue.deleteMany()
        }

        // Activate the selected Open Play
        const openPlay = await tx.openPlay.update({
          where: { id },
          data: {
            isActive: status === OpenPlayStatus.active,
            status: status,
          },
        })

        // Initialize lineup for registered players
        if (status === OpenPlayStatus.active) {
          await initializeLineup(tx, openPlay.id)
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
