import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { makeBookingDate } from "@/lib/utils"
import { put } from "@vercel/blob"
import { customAlphabet } from "nanoid"
import { EventBroadcast } from "@/lib/server-event/broadcaster.event"
import { BroadcastEventTypes } from "@/lib/sse-broadcaster.type"

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
const nanoid = customAlphabet(alphabet, 6)

export function generateBookingRef(): string {
  return `BK-${nanoid()}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get("date")

    let whereClause: any = {}

    if (dateStr) {
      const targetDate = new Date(dateStr)
      if (!isNaN(targetDate.getTime())) {
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))

        whereClause = {
          startTime: { gte: startOfDay },
          endTime: { lte: endOfDay },
        }
      }
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: { courts: true }, // now many-to-many
      orderBy: [{ startTime: "asc" }],
    })

    const formattedBookings = bookings.map((booking) => ({
      bookingId: booking.id,
      code: booking.code,
      courts: booking.courts.map((c) => c.name).join(", "),
      startTime: booking.startTime.toTimeString().slice(0, 5),
      endTime: booking.endTime.toTimeString().slice(0, 5),
      status: booking.status,
    }))

    return NextResponse.json(formattedBookings)
  } catch (error) {
    console.error("Error fetching bookings:", error)
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const formData = await req.formData()
  const date = formData.get("date") as string
  const startTime = formData.get("startTime") as string
  const duration = Number(formData.get("duration"))
  const courtIds = JSON.parse(formData.get("courtIds") as string)
  const fullName = formData.get("fullName") as string
  const contactNumber = formData.get("contactNumber") as string
  const emailAddress = formData.get("emailAddress") as string
  const proofOfPayment = formData.get("proofOfPayment") as File

  const { start, end } = makeBookingDate(date, startTime, duration)

  try {
    if (!proofOfPayment) return NextResponse.json({ error: "No file provided" }, { status: 400 })
    if (Array.isArray(proofOfPayment)) throw new Error("Only one image is allowed")
    if (!proofOfPayment.type.startsWith("image/")) throw new Error("File must be an image")

    const blob = await put(`proofs/${Date.now()}-${proofOfPayment.name}`, proofOfPayment, {
      access: "public",
    })

    let code: string = ""
    let attempts = 0
    while (attempts < 5) {
      const generatedCode = generateBookingRef()
      const existing = await prisma.booking.findUnique({ where: { code: generatedCode } })
      if (!existing) {
        code = generatedCode
        break
      }

      attempts++
    }

    if (!code) throw new Error("Cannot book at this moment. Please try again later.")

    const courts = await prisma.court.findMany({
      where: { id: { in: courtIds } },
      select: { id: true, pricePerHour: true },
    })

    // 4. Calculate total price
    const totalPrice = courts.reduce((sum, court) => sum + court.pricePerHour * duration, 0)

    const result = await prisma.$transaction(async (tx) => {
      const conflicts = await tx.booking.findMany({
        where: {
          courts: { some: { id: { in: courtIds } } },
          startTime: { lt: end },
          endTime: { gt: start },
        },
      })
      if (conflicts.length > 0) throw new Error("One or more courts already booked in this slot")

      // Create one booking with many courts
      const created = await tx.booking.create({
        data: {
          code,
          fullName,
          contactNumber,
          emailAddress,
          startTime: start,
          endTime: end,
          status: "pending",
          notes: "Awaiting payment verification",
          proofOfPaymentLink: blob.url,
          totalPrice,
          courts: {
            connect: courtIds.map((id: string) => ({ id })),
          },
        },
        include: { courts: true },
      })

      return created
    })

    EventBroadcast({
      type: BroadcastEventTypes.BOOKING_CREATED,
      data: result,
    })

    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    console.error("Booking error:", err)
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again later" },
      { status: 400 },
    )
  }
}
