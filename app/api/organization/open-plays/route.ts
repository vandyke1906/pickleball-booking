import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withRateLimit } from "@/lib/server/rate-limiter"
import { DEFAULT_PER_PAGE } from "@/lib/utils"

export const GET = withRateLimit(async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organizationId")
    const page = parseInt(searchParams.get("page") || "1", 10)
    const perPage =
      parseInt(
        searchParams.get("perPage") ??
          (typeof DEFAULT_PER_PAGE !== "undefined" ? DEFAULT_PER_PAGE.toString() : "50"),
        10,
      ) || 50
    const skip = (page - 1) * perPage

    if (!organizationId) throw new Error("Organization required")

    let whereClause: any = { organizationId }
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
    let orderBy: any[] = [{ isActive: "asc" }]
    const sortStr = searchParams.get("sort")
    if (sortStr) {
      const sort = JSON.parse(sortStr)
      orderBy = sort.map((s: any) => ({
        [s.id]: s.desc ? "desc" : "asc",
      }))
    }

    // Total count for pagination
    const totalCount = await prisma.openPlay.count({ where: whereClause })

    const data = await prisma.openPlay.findMany({
      where: whereClause,
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        courts: true,
        players: true,
      },
      orderBy,
      skip,
      take: perPage,
    })

    return NextResponse.json({
      page,
      perPage,
      totalCount,
      data,
    })
  } catch (error: any) {
    console.error("Error fetching open plays:", error?.message || error)
    return NextResponse.json({ error: "Failed to fetch open plays" }, { status: 500 })
  }
})
