import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get("date")

    let whereClause = {}

    if (dateStr) {
      const targetDate = new Date(dateStr)
      if (!isNaN(targetDate.getTime())) {
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))

        whereClause = {
          startTime: {
            gte: startOfDay,
          },
          endTime: {
            lte: endOfDay,
          },
        }
      }
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        court: true,
      },
      orderBy: [{ courtId: "asc" }, { startTime: "asc" }],
    })

    const formattedBookings = bookings.map((booking) => ({
      courtId: booking.courtId,
      courtName: booking.court.name,
      startTime: booking.startTime.toTimeString().slice(0, 5),
      endTime: booking.endTime.toTimeString().slice(0, 5),
    }))

    return NextResponse.json(formattedBookings)
  } catch (error) {
    console.error("Error fetching bookings:", error)
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 })
  }
}
