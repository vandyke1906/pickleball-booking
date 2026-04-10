import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withRateLimit } from "@/lib/server/rate-limiter"

export const GET = withRateLimit(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get("slug")
    if (!slug) throw new Error("Organization required")
    const where = { slug }
    const organization = await prisma.organization.findUnique({
      where,
      select: {
        id: true,
        name: true,
        openingHours: {
          select: {
            startHour: true,
            endHour: true,
          },
          orderBy: { startHour: "asc" },
        },
        pricingRules: {
          select: {
            startHour: true,
            endHour: true,
            price: true,
          },
          orderBy: { startHour: "asc" },
        },
        courts: {
          select: {
            id: true,
            name: true,
            location: true,
          },
          orderBy: { name: "asc" },
        },
      },
    })

    if (!organization) return NextResponse.json(null)

    const formatted = {
      id: organization.id,
      name: organization.name,
      openingHours: organization.openingHours.map((h) => ({
        startHour: h.startHour,
        endHour: h.endHour,
      })),
      pricingRules: organization.pricingRules.map((r) => ({
        startHour: r.startHour,
        endHour: r.endHour,
        price: r.price,
      })),
      courts: organization.courts.map((court) => ({
        id: court.id,
        name: court.name,
        location: court.location,
      })),
    }

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Error fetching organizations:", error)
    return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 })
  }
})
