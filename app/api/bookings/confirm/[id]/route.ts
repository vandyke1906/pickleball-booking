import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isServerAuthenticated } from "@/lib/auth/auth.server"
import { sendClientBookingStatusEmail } from "@/lib/nodemailer/sender/sender.email"
import { ReadableStatus, TStatus } from "@/components/common/badge-status"
import { withRateLimit } from "@/lib/server/rate-limiter"

export const POST = withRateLimit(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const [session, { id }] = await Promise.all([isServerAuthenticated(), params])
      if (!session?.user)
        return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })

      // Parse JSON body from client
      const body = await request.json()
      const { accept } = body

      const result = await prisma.booking.update({
        where: { id, status: "pending" },
        data: {
          status: accept ? "confirmed" : "cancelled",
        },
        include: { courts: true },
      })

      sendClientBookingStatusEmail({
        booking: {
          code: result.code,
          bookedBy: result.fullName,
          contactNumber: result.contactNumber ?? "",
          emailAddress: result.emailAddress ?? "",
          status: ReadableStatus(result.status as TStatus),
          proofOfPayment: result.proofOfPaymentLink,
          totalPrice: (result.totalPrice ?? 0).toString(),
          start: result.startTime.toString(),
          end: result.endTime.toString(),
          courts: result.courts.map((c) => ({
            name: c.name,
          })),
        },
      }).catch((err) => console.error("Email send failed:", err))

      return NextResponse.json({ success: true, status: accept ? "confirmed" : "cancelled" })
    } catch (error) {
      console.error("Error confirming booking:", error)
      return NextResponse.json({ error: "Failed confirming booking" }, { status: 500 })
    }
  },
)
