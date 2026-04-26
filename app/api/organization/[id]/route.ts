import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { organizationUpdateSchema } from "@/lib/validation/organization/organization.validation"
import { EventBroadcast } from "@/lib/server-event/broadcaster.event"
import { BroadcastEventTypes } from "@/lib/event-broadcaster.type"
import { withRateLimit } from "@/lib/server/rate-limiter"
import { isServerAuthenticated } from "@/lib/auth/auth.server"

export const PUT = withRateLimit(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const [session, { id }] = await Promise.all([isServerAuthenticated(), params])
      if (!session?.user || id !== session?.user?.organizationId)
        return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })

      const body = await request.json()

      // Validate against schema
      const parsed = organizationUpdateSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.format() },
          { status: 400 },
        )
      }

      const { openingHours, pricingRules, customPricingRules = [] } = parsed.data

      // Update organization with nested relations
      const result = await prisma.organization.update({
        where: { id },
        data: {
          openingHours: {
            deleteMany: {},
            create: openingHours.map((h) => ({
              startHour: h.startHour,
              endHour: h.endHour,
            })),
          },
          pricingRules: {
            deleteMany: {},
            create: pricingRules.map((r) => ({
              startHour: r.startHour,
              endHour: r.endHour,
              price: r.price,
            })),
          },
          custompricingRules: {
            deleteMany: {},
            create: customPricingRules.map((cr) => ({
              startDate: cr.startDate,
              endDate: cr.endDate,
              startHour: cr.startHour,
              endHour: cr.endHour,
              price: cr.price,
            })),
          },
        },
      })

      // Broadcast update to clients (optional, if you have event system)
      EventBroadcast({
        type: BroadcastEventTypes.ORGANIZATION_UPDATED,
        data: result,
      })

      return NextResponse.json({ success: true, result })
    } catch (error: any) {
      console.error("Error updating organization:", error?.message || error)
      return NextResponse.json({ error: "Failed updating organization" }, { status: 500 })
    }
  },
)
