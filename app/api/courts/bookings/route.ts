import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { formatDateTime } from "@/lib/utils"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organizationId")
    const allParam = searchParams.get("all")
    const dateParam = searchParams.get("date")
    const all = allParam === "true"
    console.info({ dateParam })
    if (all) {
      // const session = await isServerAuthenticated()
    }

    let whereDate = {}
    if (dateParam) {
      const startOfDayPH = formatDateTime(`${dateParam}T00:00:00`)
      const endOfDayPH = formatDateTime(`${dateParam}T23:59:59.999`)

      whereDate = {
        startTime: { gte: startOfDayPH },
        endTime: { lt: endOfDayPH },
        ...(all ? {} : { status: { in: ["pending", "confirmed"] } }),
      }
    }

    const where = organizationId ? { organizationId } : {}

    const courts = await prisma.court.findMany({
      where,
      select: {
        id: true,
        name: true,
        location: true,
        pricePerHour: true,
        organization: {
          select: {
            id: true,
            name: true,
            openTime: true,
            closeTime: true,
          },
        },
        bookings: {
          where: dateParam ? whereDate : all ? {} : { status: { in: ["pending", "confirmed"] } },
          select: {
            id: true,
            code: true,
            fullName: true,
            startTime: true,
            endTime: true,
            status: true,
            ...(all && {
              contactNumber: true,
              emailAddress: true,
              totalPrice: true,
              proofOfPaymentLink: true,
              notes: true,
              courts: { select: { id: true, name: true, pricePerHour: true } },
            }),
          },
          orderBy: { startTime: "asc" },
        },
      },
      orderBy: { name: "asc" },
    })

    const formatted = courts.map((court) => ({
      id: court.id,
      name: court.name,
      location: court.location,
      pricePerHour: court.pricePerHour,
      organization: {
        id: court.organization.id,
        name: court.organization.name,
        openTime: court.organization.openTime,
        closeTime: court.organization.closeTime,
      },
      bookings: court.bookings.map((b) => ({
        id: b.id,
        code: b.code,
        fullName: b.fullName,
        status: b.status,
        startTime: b.startTime,
        endTime: b.endTime,
        ...(all && {
          totalPrice: b.totalPrice ?? 0,
          proofOfPaymentLink: b.proofOfPaymentLink,
          notes: b.notes ?? "",
          courts: b.courts.map((c) => ({ id: c.id, name: c.name, pricePerHour: c.pricePerHour })),
        }),
      })),
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Error fetching courts with bookings:", error)
    return NextResponse.json({ error: "Failed to fetch courts with bookings" }, { status: 500 })
  }
}
