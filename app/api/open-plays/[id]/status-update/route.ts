import { OpenPlayStatus } from "@/.config/prisma/generated/prisma"
import { isServerAuthenticated } from "@/lib/auth/auth.server"
import { prisma } from "@/lib/prisma"
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
              status: OpenPlayStatus.completed,
            },
          })
        }

        // Activate the selected Open Play
        return await tx.openPlay.update({
          where: { id },
          data: {
            status: status,
          },
        })
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
