import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organizationId")

    const where = organizationId ? { id: organizationId } : {}

    const organizations = await prisma.organization.findMany({
      where,
      select: {
        id: true,
        name: true,
        openTime: true,
        closeTime: true,
        courts: {
          select: {
            id: true,
            name: true,
            location: true,
            pricePerHour: true,
          },
          orderBy: {
            name: "asc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    const formatted = organizations.map((org) => ({
      id: org.id,
      name: org.name,
      openTime: org.openTime,
      closeTime: org.closeTime,
      courts: org.courts.map((court) => ({
        id: court.id,
        name: court.name,
        location: court.location,
        pricePerHour: court.pricePerHour,
      })),
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Error fetching organizations:", error)
    return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 })
  }
}
