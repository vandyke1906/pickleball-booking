import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withRateLimit } from "@/lib/server/rate-limiter"

export const GET = withRateLimit(
  async (request: NextRequest, { params }: { params: Promise<{ code: string }> }) => {
    try {
      const { code } = await params
      if (!code)
        return NextResponse.json({ success: false, message: "Please provide booking code!" })
      const booking = await prisma.booking.findUnique({
        where: { code },
        select: {
          code: true,
          fullName: true,
          emailAddress: true,
          contactNumber: true,
          startTime: true,
          endTime: true,
          proofOfPaymentLink: true,
          totalPrice: true,
          status: true,
          notes: true,
          courts: {
            select: {
              name: true,
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
        proofOfPaymentLink: booking.proofOfPaymentLink,
        status: booking.status,
        start: booking.startTime,
        end: booking.endTime,
        totalPrice: booking.totalPrice ?? 0,
        notes: booking.notes ?? "",
        courts: booking.courts.map((c) => ({ name: c.name })),
      }

      return NextResponse.json({ success: true, data })
    } catch (error) {
      console.error("Error getting booking:", error)
      return NextResponse.json({ error: "Failed to get booking" }, { status: 500 })
    }
  },
)
