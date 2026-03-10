import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organizationId")

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
      },
      orderBy: {
        name: "asc",
      },
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
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Error fetching courts:", error)
    return NextResponse.json({ error: "Failed to fetch courts" }, { status: 500 })
  }
}
