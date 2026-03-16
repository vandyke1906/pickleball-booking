import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withRateLimit } from "@/lib/server/rate-limiter"

export const DELETE = withRateLimit(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      if (!id) return NextResponse.json({ success: false, message: "Please provide booking ID!" })
      await prisma.booking.delete({ where: { id } })
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error("Error deleting booking:", error)
      return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 })
    }
  },
)
