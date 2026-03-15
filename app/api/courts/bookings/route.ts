import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isServerAuthenticated } from "@/lib/auth/auth.server"
import { buildDateRanges, normalizeOpeningHours } from "@/lib/utils"
import { withRateLimit } from "@/lib/server/rate-limiter"

export const GET = withRateLimit(async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organizationId")
    const allParam = searchParams.get("all")
    const dateParam = searchParams.get("date")
    const statusesParam = (searchParams.get("statuses") || "").split("&").map((s) => s.trim()) ?? []

    const all = allParam === "true"

    if (!organizationId)
      return NextResponse.json({ error: "Organization is required" }, { status: 401 })

    if (all) {
      const session = await isServerAuthenticated()
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let whereDate: any = {}
    if (dateParam) {
      const openingHours = await prisma.organizationOpeningHour.findMany({
        where: { organizationId },
        orderBy: { startHour: "asc" },
      })
      const normalized = normalizeOpeningHours(openingHours)
      const ranges = buildDateRanges(dateParam, normalized)

      whereDate = {
        OR: ranges.map((r) => ({
          startTime: { gte: r.start },
          endTime: { lte: r.end },
        })),
        status: { in: ["pending", "confirmed"] },
      }

      console.info({ dateParam, normalized })
      ranges.forEach((r, idx) => {
        console.info(
          `Start ${idx + 1}:`,
          r.start.toLocaleString("en-PH", { timeZone: "Asia/Manila" }),
          "End",
          r.end.toLocaleString("en-PH", { timeZone: "Asia/Manila" }),
        )
      })
    }

    const courts = await prisma.court.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        location: true,
        organization: {
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            address: true,
            contactNumber: true,
            email: true,
            facebookPage: true,
            tiktokPage: true,
            instagramPage: true,
            youtubePage: true,
            openingHours: {
              select: { startHour: true, endHour: true },
              orderBy: { startHour: "asc" },
            },
            pricingRules: {
              select: { startHour: true, endHour: true, price: true },
              orderBy: { startHour: "asc" },
            },
          },
        },
        bookings: {
          where: dateParam
            ? whereDate
            : all
              ? {}
              : statusesParam.length
                ? { status: { in: statusesParam } }
                : { status: { in: ["pending", "confirmed"] } },
          select: {
            id: true,
            code: true,
            fullName: true,
            contactNumber: true,
            emailAddress: true,
            proofOfPaymentLink: true,
            totalPrice: true,
            createdAt: true,
            startTime: true,
            endTime: true,
            status: true,
            ...(all && {
              notes: true,
              courts: { select: { id: true, name: true, location: true } },
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
      organization: {
        id: court.organization.id,
        slug: court.organization.slug,
        name: court.organization.name,
        description: court.organization.description,
        address: court.organization.address,
        contactNumber: court.organization.contactNumber,
        email: court.organization.email,
        facebookPage: court.organization.facebookPage,
        tiktokPage: court.organization.tiktokPage,
        instagramPage: court.organization.instagramPage,
        youtubePage: court.organization.youtubePage,
        openingHours: court.organization.openingHours.map((h) => ({
          startHour: h.startHour,
          endHour: h.endHour,
        })),
        pricingRules: court.organization.pricingRules.map((r) => ({
          startHour: r.startHour,
          endHour: r.endHour,
          price: r.price,
        })),
      },
      bookings: court.bookings.map((b) => ({
        id: b.id,
        code: b.code,
        fullName: b.fullName,
        emailAddress: b.emailAddress,
        contactNumber: b.contactNumber,
        proofOfPaymentLink: b.proofOfPaymentLink,
        totalPrice: b.totalPrice,
        status: b.status,
        startTime: b.startTime,
        endTime: b.endTime,
        ...(all && {
          notes: b.notes ?? "",
          courts: b.courts.map((c) => ({
            id: c.id,
            name: c.name,
            location: c.location,
          })),
        }),
      })),
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Error fetching courts with bookings:", error)
    return NextResponse.json({ error: "Failed to fetch courts with bookings" }, { status: 500 })
  }
})
