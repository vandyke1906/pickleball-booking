import { prisma } from "@/lib/prisma"
import { addMinutes } from "date-fns"
import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { makeBookingDate } from "@/lib/utils"

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
  console.log("Raw:", start) // shows UTC representation
  console.log("Local:", start.toLocaleString("en-PH", { hour12: false }))

  // return NextResponse.json({ success: true, result: "okay" })
  try {
    const result = await prisma.$transaction(async (tx) => {
      const conflicts = await tx.booking.findMany({
        where: {
          courts: { some: { id: { in: courtIds } } },
          startTime: { lt: end },
          endTime: { gt: start },
        },
      })
      if (conflicts.length > 0) throw new Error("One or more courts already booked in this slot")

      // Save proof file to disk (or cloud storage)
      // const uploadDir = path.join(process.cwd(), "uploads")
      // await fs.mkdir(uploadDir, { recursive: true })
      // const filePath = path.join(uploadDir, `${Date.now()}-${proofOfPayment.name}`)
      // const buffer = Buffer.from(await proofOfPayment.arrayBuffer())
      // await fs.writeFile(filePath, buffer)

      // Create one booking with many courts
      const created = await tx.booking.create({
        data: {
          code: `PICKLEBALL-REF-#-${Date.now()}`, // unique booking code
          fullName,
          contactNumber,
          emailAddress,
          startTime: start,
          endTime: end,
          status: "pending",
          notes: "Awaiting payment verification",
          courts: {
            connect: courtIds.map((id: string) => ({ id })),
          },
          // optional: store proof path
          // proofOfPaymentPath: filePath,
        },
        include: { courts: true },
      })

      return created
    })

    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    console.error("Booking error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 400 })
  }
}
