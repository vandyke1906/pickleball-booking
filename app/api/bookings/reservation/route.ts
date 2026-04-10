import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { makeBookingDate } from "@/lib/utils"
import { customAlphabet } from "nanoid"
import { EventBroadcast } from "@/lib/server-event/broadcaster.event"
import { BroadcastEventTypes } from "@/lib/event-broadcaster.type"
import { withRateLimit } from "@/lib/server/rate-limiter"

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
const nanoid = customAlphabet(alphabet, 6)

export function generateReservationRef(): string {
  return `RSV-${nanoid()}`
}

export const POST = withRateLimit(async (req: NextRequest) => {
  const formData = await req.formData()
  const date = formData.get("date") as string
  const startTime = formData.get("startTime") as string
  const duration = Number(formData.get("duration"))
  const courtIds = JSON.parse(formData.get("courtIds") as string)
  const fullName = formData.get("fullName") as string
  const contactNumber = formData.get("contactNumber") as string
  const emailAddress = formData.get("emailAddress") as string

  const { start, end } = makeBookingDate(date, startTime, duration)
  console.info("Reservation Details: ", { date, startTime, duration })
  console.info("UTC Date Equivalent: ", { start, end })

  try {
    let code: string = ""
    let attempts = 0
    while (attempts < 5) {
      const generatedCode = generateReservationRef()
      const existing = await prisma.booking.findUnique({ where: { code: generatedCode } })
      if (!existing) {
        code = generatedCode
        break
      }

      attempts++
    }

    if (!code) throw new Error("Cannot reserve at this moment. Please try again later.")

    const courts = await prisma.court.findMany({
      where: { id: { in: courtIds } },
      select: {
        id: true,
        organization: {
          select: { pricingRules: true, email: true },
        },
      },
    })

    const startHour = parseInt(startTime.split(":")[0], 10) //Parse booking start time string "HH:mm" → integer hour
    const endHour = startHour + duration

    const pricingRules = courts[0]?.organization?.pricingRules || [] //Get pricing rules from the first court’s organization (all share the same org rules)

    const basePrice = calculateBasePrice(startHour, endHour, pricingRules)

    // Multiply by number of courts selected
    const totalPrice = basePrice * courts.length

    const result = await prisma.$transaction(async (tx) => {
      const conflicts = await tx.booking.findMany({
        where: {
          courts: { some: { id: { in: courtIds } } },
          startTime: { lt: end },
          endTime: { gt: start },
          status: { in: ["pending", "confirmed", "reserved"] },
        },
      })
      if (conflicts.length > 0) throw new Error("One or more courts already booked in this slot")

      // Create one booking with many courts
      const created = await tx.booking.create({
        data: {
          code,
          fullName: fullName,
          contactNumber: contactNumber,
          emailAddress: emailAddress,
          startTime: start,
          endTime: end,
          status: "reserved",
          notes: "Admin Reservation",
          proofOfPaymentLink: "",
          totalPrice,
          courts: {
            connect: courtIds.map((id: string) => ({ id })),
          },
        },
        include: { courts: true },
      })

      return created
    })

    const booking = {
      code: result.code,
      bookedBy: result.fullName,
      contactNumber: result.contactNumber ?? "",
      emailAddress: result.emailAddress ?? "",
      status: result.status,
      proofOfPayment: result.proofOfPaymentLink,
      totalPrice: (result.totalPrice ?? 0).toString(),
      start: result.startTime.toString(),
      end: result.endTime.toString(),
      courts: result.courts.map((c) => ({
        name: c.name,
      })),
    }

    //update ui of all clients
    EventBroadcast({
      type: BroadcastEventTypes.BOOKING_CREATED,
      data: result,
    })

    return NextResponse.json({ success: true, result: booking })
  } catch (err: any) {
    console.error("Reservation error:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Something went wrong. Please try again later" },
      { status: 400 },
    )
  }
})

export function calculateBasePrice(
  startHour: number,
  endHour: number,
  pricingRules: { startHour: number; endHour: number; price: number }[],
): number {
  const normalizeRanges = (start: number, end: number) => {
    const ranges: { startHour: number; endHour: number }[] = []
    let currentStart = start
    let currentEnd = end

    while (currentEnd > 24) {
      ranges.push({ startHour: currentStart, endHour: 24 })
      currentStart = 0
      currentEnd -= 24
    }
    ranges.push({ startHour: currentStart, endHour: currentEnd })
    return ranges
  }

  const ranges = normalizeRanges(startHour, endHour)

  return ranges.reduce((total, range) => {
    return (
      total +
      pricingRules.reduce((sum, rule) => {
        const overlapStart = Math.max(range.startHour, rule.startHour)
        const overlapEnd = Math.min(range.endHour, rule.endHour)
        const hours = Math.max(0, overlapEnd - overlapStart)
        return sum + hours * rule.price
      }, 0)
    )
  }, 0)
}
