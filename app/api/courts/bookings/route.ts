import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { formatISO } from "date-fns"
import { isServerAuthenticated } from "@/lib/auth/auth.server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organizationId")
    const allParam = searchParams.get("all")
    const dateParam = searchParams.get("date")
    const all = allParam === "true"
    if (all) {
      // const session = await isServerAuthenticated()
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
          where: dateParam
            ? {
                startTime: { gte: new Date(`${dateParam}T00:00:00`) },
                endTime: { lt: new Date(`${dateParam}T23:59:59`) },
                ...(all ? {} : { status: { in: ["pending", "confirmed"] } }),
              }
            : all
              ? {}
              : { status: { in: ["pending", "confirmed"] } },
          select: {
            id: true,
            fullName: true,
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
      bookings: court.bookings.map((b) => ({
        id: b.id,
        fullName: b.fullName,
        status: b.status,
        startTime: formatISO(new Date(b.startTime)),
        endTime: formatISO(new Date(b.endTime)),
      })),
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Error fetching courts with bookings:", error)
    return NextResponse.json({ error: "Failed to fetch courts with bookings" }, { status: 500 })
  }
}
