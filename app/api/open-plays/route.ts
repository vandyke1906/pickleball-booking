import { isServerAuthenticated } from "@/lib/auth/auth.server"
import { prisma } from "@/lib/prisma"
import { withRateLimit } from "@/lib/server/rate-limiter"
import { makeBookingDate } from "@/lib/utils"
import { NextRequest, NextResponse } from "next/server"
import { customAlphabet } from "nanoid"

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
const nanoid = customAlphabet(alphabet, 6)

export function generateRegistrationCode(): string {
  return nanoid().toUpperCase()
}

//CREATE OR UPDATE
export const POST = withRateLimit(async (req: NextRequest) => {
  const session = await isServerAuthenticated()
  if (!session?.user) return NextResponse.json({ error: "Action not allowed" }, { status: 401 })

  const formData = await req.formData()
  const id = formData.get("id") as string
  const date = formData.get("date") as string
  const startTime = formData.get("startTime") as string
  const duration = Number(formData.get("duration"))
  const transitionMinutes = Number(formData.get("transitionMinutes"))
  const preparationSeconds = Number(formData.get("preparationSeconds"))
  const courtIds = JSON.parse(formData.get("courtIds") as string)
  const groupSkills = JSON.parse(formData.get("groupSkills") as string)

  const { start, end } = makeBookingDate(date, startTime, duration)
  console.info("[Open Play] Details: ", { date, startTime, duration })
  console.info("[Open Play] UTC Date Equivalent: ", { start, end })

  try {
    const result = await prisma.$transaction(async (tx) => {
      const whereClauseConflict: any = {
        courts: { some: { id: { in: courtIds } } },
        startTime: { lt: end },
        endTime: { gt: start },
        status: { in: ["pending", "active"] },
      }
      if (id) whereClauseConflict.NOT = { id }
      const conflicts = await tx.openPlay.findMany({ where: whereClauseConflict })
      if (conflicts.length > 0) throw new Error("One or more open plays already scheduled")

      if (id) {
        const updated = await tx.openPlay.update({
          where: { id },
          data: {
            startTime: start,
            endTime: end,
            transitionMinutes,
            preparationSeconds,
            courts: {
              set: [],
              connect: courtIds.map((id: string) => ({ id })),
            },
            groups: {
              deleteMany: {},
              create: groupSkills.map((c: any) => ({
                skills: { set: c.skills },
              })),
            },
          },
          include: {
            courts: true,
            groups: true,
          },
        })

        return updated
      } else {
        const created = await tx.openPlay.create({
          data: {
            organizationId: session.user.organizationId!,
            startTime: start,
            endTime: end,
            transitionMinutes: transitionMinutes,
            preparationSeconds: preparationSeconds,
            courts: { connect: courtIds.map((id: string) => ({ id })) },
            groups: {
              create: groupSkills.map((c: any) => ({
                skills: { set: c.skills },
              })),
            },
            registrationCodes: {
              create: Array.from({ length: 100 }, () => ({
                code: generateRegistrationCode(),
              })),
            },
          },
          include: { courts: true, groups: true },
        })

        return created
      }
    })

    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    console.error("Create/Update Open Play error:", err?.message)
    return NextResponse.json(
      { success: false, error: err.message || "Something went wrong. Please try again later" },
      { status: 400 },
    )
  }
})
