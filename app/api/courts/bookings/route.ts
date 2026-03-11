import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { format } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organizationId")
    const dateParam = searchParams.get("date")

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
          where: dateParam
            ? {
                startTime: {
                  gte: new Date(dateParam + "T00:00:00.000Z"),
                },
                endTime: {
                  lt: new Date(dateParam + "T23:59:59.999Z"),
                },
                status: { in: ["pending", "confirmed"] },
              }
            : {
                status: { in: ["pending", "confirmed"] },
              },
          select: {
            id: true,
            userName: true,
            startTime: true,
            endTime: true,
            status: true,
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
      bookings: court.bookings.map((b) => {
        return {
          id: b.id,
          userName: b.userName,
          startTime: format(
            new Date(b.startTime.toISOString().slice(0, 19)),
            "yyyy-MM-dd HH:mm:ss",
          ),
          endTime: format(new Date(b.endTime.toISOString().slice(0, 19)), "yyyy-MM-dd HH:mm:ss"),
          status: b.status,
        }
      }),
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Error fetching courts with bookings:", error)
    return NextResponse.json({ error: "Failed to fetch courts with bookings" }, { status: 500 })
  }
}
