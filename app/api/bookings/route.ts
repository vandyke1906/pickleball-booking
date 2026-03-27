import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { formatTimeOnly, makeBookingDate } from "@/lib/utils"
import { put } from "@vercel/blob"
import { customAlphabet } from "nanoid"
import { EventBroadcast } from "@/lib/server-event/broadcaster.event"
import { BroadcastEventTypes } from "@/lib/sse-broadcaster.type"
import { formatISO } from "date-fns"
import {
  sendAdminBookingNotificationEmail,
  sendBookingConfirmationEmail,
} from "@/lib/nodemailer/sender/sender.email"
import { createNotificationForOrg } from "@/lib/server/action/notification.action"
import sharp from "sharp"
import { withRateLimit } from "@/lib/server/rate-limiter"

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
const nanoid = customAlphabet(alphabet, 6)

export function generateBookingRef(): string {
  return `BK-${nanoid()}`
}

export const GET = withRateLimit(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get("date")
    const page = parseInt(searchParams.get("page") || "1", 10)
    const perPage = parseInt(searchParams.get("perPage") || "10", 10)
    const skip = (page - 1) * perPage

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

    // Filters
    const filtersStr = searchParams.get("filters")
    if (filtersStr) {
      const filters = JSON.parse(filtersStr)
      filters.forEach((f: any) => {
        if (f.operator === "inArray") {
          whereClause[f.id] = { in: f.value }
        } else if (f.operator === "equals") {
          whereClause[f.id] = f.value
        }
      })
    }

    // Sorting
    let orderBy: any[] = [{ startTime: "asc" }]
    const sortStr = searchParams.get("sort")
    if (sortStr) {
      const sort = JSON.parse(sortStr)
      orderBy = sort.map((s: any) => ({
        [s.id]: s.desc ? "desc" : "asc",
      }))
    }

    // Total count for pagination
    const totalCount = await prisma.booking.count({ where: whereClause })

    // Paginated data
    const bookings = await prisma.booking.findMany({
      where: whereClause,
      select: {
        id: true,
        code: true,
        startTime: true,
        endTime: true,
        status: true,
        fullName: true,
        contactNumber: true,
        emailAddress: true,
        totalPrice: true,
        createdAt: true,
        courts: { select: { name: true } },
      },
      orderBy,
      skip,
      take: perPage,
    })

    const formattedBookings = bookings.map((booking) => ({
      bookingId: booking.id,
      code: booking.code,
      fullName: booking.fullName,
      contactNumber: booking.contactNumber,
      emailAddress: booking.emailAddress,
      totalPrice: booking.totalPrice,
      courts: booking.courts.map((c) => c.name),
      status: booking.status,
      startTime: formatTimeOnly(booking.startTime.toISOString()),
      endTime: formatTimeOnly(booking.endTime.toISOString()),
      bookedDate: booking.startTime.toDateString(),
      createdAt: formatISO(new Date(booking.createdAt)),
    }))

    return NextResponse.json({
      page,
      perPage,
      totalCount,
      data: formattedBookings,
    })
  } catch (error) {
    console.error("Error fetching bookings:", error)
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 })
  }
})

export const POST = withRateLimit(async (req: Request) => {
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
  console.info("Booking Details: ", { date, startTime, duration })
  console.info("UTC Date Equivalent: ", { start, end })

  try {
    if (!proofOfPayment) return NextResponse.json({ error: "No file provided" }, { status: 400 })
    if (Array.isArray(proofOfPayment)) throw new Error("Only one image is allowed")
    if (!proofOfPayment.type.startsWith("image/")) throw new Error("File must be an image")
    let url = ""
    try {
      const optimizedBuffer = await optimizeImage(proofOfPayment, {
        maxWidth: 1200,
        format: "jpeg",
        quality: 80,
      })

      const blob = await put(
        `proofs/${Date.now()}-${proofOfPayment.name.replace(/\s+/g, "_")}`,
        optimizedBuffer,
        { access: "public" },
      )

      url = blob.url
    } catch (error) {
      throw new Error("Error uploading proof of payment. Please try again later.")
    }

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
    const organizationEmail = courts[0]?.organization?.email || ""

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
          fullName,
          contactNumber,
          emailAddress,
          startTime: start,
          endTime: end,
          status: "pending",
          notes: "Awaiting payment verification",
          proofOfPaymentLink: url,
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

    //notification related
    Promise.allSettled([
      sendBookingConfirmationEmail({ booking }),
      sendAdminBookingNotificationEmail({ adminEmailAddress: organizationEmail, booking }),
      createNotificationForOrg(result?.courts?.[0].organizationId, {
        title: "Booking Created",
        message: `Booking ${result.code} was created by ${result.fullName}`,
        type: "info",
        link: `/admin/dashboard?confirmation-booking=${result.code}`,
      }),
    ])

    return NextResponse.json({ success: true, result: booking })
  } catch (err: any) {
    console.error("Booking error:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Something went wrong. Please try again later" },
      { status: 400 },
    )
  }
})

/**
 * Optimize an image using Sharp.
 * Accepts either a browser File or a Node Buffer.
 */
async function optimizeImage(
  file: File | Buffer,
  options?: {
    maxWidth?: number
    format?: "jpeg" | "png" | "webp"
    quality?: number
  },
): Promise<Buffer> {
  const { maxWidth = 1200, format = "jpeg", quality = 80 } = options || {}

  let buffer: Buffer

  if (typeof (file as File).arrayBuffer === "function") {
    buffer = Buffer.from(await (file as File).arrayBuffer()) // Browser File
  } else {
    buffer = file as Buffer // Node Buffer
  }

  let pipeline = sharp(buffer).resize({ width: maxWidth, withoutEnlargement: true })

  switch (format) {
    case "jpeg":
      pipeline = pipeline.jpeg({ quality })
      break
    case "png":
      pipeline = pipeline.png({ compressionLevel: 9 })
      break
    case "webp":
      pipeline = pipeline.webp({ quality })
      break
  }

  return pipeline.toBuffer()
}

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
