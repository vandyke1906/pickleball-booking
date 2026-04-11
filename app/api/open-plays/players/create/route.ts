import { OpenPlayStatus } from "@/.config/prisma/generated/prisma"
import { isServerAuthenticated } from "@/lib/auth/auth.server"
import { prisma } from "@/lib/prisma"
import { createLineupEntry } from "@/lib/server/action/openplay.action"
import { withRateLimit } from "@/lib/server/rate-limiter"
import { openPlayPlayerSchema } from "@/lib/validation/open-play/open-play.validation"
import { NextRequest, NextResponse } from "next/server"

export const POST = withRateLimit(async (req: NextRequest) => {
  const session = await isServerAuthenticated()
  if (!session?.user) return NextResponse.json({ error: "Action not allowed" }, { status: 401 })

  try {
    const formData = await req.formData()
    const payload = {
      openPlayId: formData.get("openPlayId") as string,
      playerName: formData.get("playerName") as string,
      code: (formData.get("code") as string) || "",
      contactNumber: (formData.get("contactNumber") as string) || "",
      emailAddress: (formData.get("emailAddress") as string) || "",
    }

    // Validate payload with Zod
    const parsed = openPlayPlayerSchema.parse(payload)

    // Check for unique code per OpenPlay
    const existing = await prisma.openPlayPlayer.findUnique({
      where: { openPlayId_code: { openPlayId: parsed.openPlayId, code: parsed.code } },
    })

    if (existing)
      return NextResponse.json(
        { success: false, error: "Player code already exists for this open play" },
        { status: 400 },
      )

    // Create player

    const createdPlayer = await prisma.$transaction(async (tx) => {
      const player = await tx.openPlayPlayer.create({
        data: {
          openPlayId: parsed.openPlayId,
          playerName: parsed.playerName,
          code: parsed.code,
          contactNumber: parsed.contactNumber,
          emailAddress: parsed.emailAddress || null,
        },
      })
      const openPlay = await tx.openPlay.findUnique({ where: { id: parsed.openPlayId } })

      //if active open play then lineup directly
      if (openPlay && openPlay.status === OpenPlayStatus.active) await createLineupEntry(tx, player)

      return player
    })

    return NextResponse.json({ success: true, result: createdPlayer })
  } catch (err: any) {
    console.error("Create Open Play Player error:", err)

    if (err?.issues) {
      return NextResponse.json(
        { success: false, error: "Validation failed", issues: err.issues },
        { status: 400 },
      )
    }

    return NextResponse.json(
      { success: false, error: err.message || "Something went wrong" },
      { status: 400 },
    )
  }
})
