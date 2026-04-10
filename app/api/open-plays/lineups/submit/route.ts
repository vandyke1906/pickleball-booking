import { QueueStatus } from "@/.config/prisma/generated/prisma"
import { prisma } from "@/lib/prisma"
import { withRateLimit } from "@/lib/server/rate-limiter"
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
            code: code.trim().toUpperCase(),
          },
        },
        include: { openPlay: true },
      })

      if (!openPlayPlayer) throw new Error("Invalid code or open play session")

      // Check session time
      const now = new Date()
      if (now > openPlayPlayer.openPlay.endTime)
        throw new Error("Open play session has already ended")

      // Prevent duplicate queue entry
      const existing = await tx.lineupQueue.findFirst({
        where: {
          playerId: openPlayPlayer.id,
          status: QueueStatus.waiting,
        },
      })

      if (existing) throw new Error("You are already in the queue")

      // Create queue entry (FIFO via createdAt)
      return await tx.lineupQueue.create({
        data: {
          playerId: openPlayPlayer.id,
          status: QueueStatus.waiting,
        },
        include: {
          player: true,
        },
      })
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
