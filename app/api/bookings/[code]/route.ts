import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { formatISO } from "date-fns"

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params
    if (!code) return NextResponse.json({ success: false, message: "Please provide booking code!" })
    const booking = await prisma.booking.findUnique({
      where: { code },
      select: {
        code: true,
        fullName: true,
        emailAddress: true,
        contactNumber: true,
        startTime: true,
        endTime: true,
        totalPrice: true,
        status: true,
        notes: true,
        courts: {
          select: {
            name: true,
            pricePerHour: true,
          },
        },
      },
    })

    if (!booking) return NextResponse.json({ success: false, message: "Booking not found!" })

    const data = {
      code: booking.code,
      fullName: booking.fullName,
      emailAddress: booking.emailAddress,
      contactNumber: booking.contactNumber,
      status: booking.status,
      startTime: booking.startTime,
      endTime: booking.endTime,
      totalPrice: booking.totalPrice ?? 0,
      notes: booking.notes ?? "",
      courts: booking.courts.map((c) => ({ name: c.name, pricePerHour: c.pricePerHour })),
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error getting booking:", error)
    return NextResponse.json({ error: "Failed to get booking" }, { status: 500 })
  }
}
