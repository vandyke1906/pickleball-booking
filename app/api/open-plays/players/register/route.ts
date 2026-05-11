import { OpenPlayStatus, PlayerSkill, Prisma } from "@/.config/prisma/generated/prisma"
import { BroadcastEventTypes } from "@/lib/event-broadcaster.type"
import { prisma } from "@/lib/prisma"
import { EventBroadcast } from "@/lib/server-event/broadcaster.event"
import { submitLineup } from "@/lib/server/action/openplay.action"
import { withRateLimit } from "@/lib/server/rate-limiter"
import { openPlayPlayerRegistrationSchema } from "@/lib/validation/open-play/open-play.validation"
import { NextRequest, NextResponse } from "next/server"

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const formData = await req.formData()
    const payload = {
      openPlayId: formData.get("openPlayId") as string,
      registrationCode: formData.get("registrationCode") as string,
      playerName: formData.get("playerName") as string,
      code: (formData.get("code") as string) || "",
      skill: (formData.get("skill") as PlayerSkill) || "",
    }
    // Validate payload with Zod
    const parsed = openPlayPlayerRegistrationSchema.parse(payload)

    // Check for unique code per OpenPlay
    const [existingPlayer, registrationCode] = await Promise.all([
      prisma.openPlayPlayer.findUnique({
        where: {
          openPlayId_code: {
            openPlayId: parsed.openPlayId,
            code: parsed.code,
          },
        },
      }),
      prisma.registrationCode.findUnique({
        where: {
          openPlayId_code: {
            openPlayId: parsed.openPlayId,
            code: parsed.registrationCode,
          },
        },
        select: { id: true },
      }),
    ])

    if (existingPlayer)
      return NextResponse.json(
        {
          success: false,
          error: "Player code already exists for this open play. Please choose a different code.",
        },
        { status: 400 },
      )

    if (!registrationCode)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Registration Code. Please check your code or contact the organizer.",
        },
        { status: 400 },
      )

    // Create player
    const createdPlayer = await prisma.$transaction(async (tx) => {
      const openPlay = await tx.openPlay.findUnique({
        where: { id: parsed.openPlayId },
        select: {
          id: true,
          status: true,
          groups: { select: { id: true, skills: true } },
          _count: {
            select: {
              players: true,
            },
          },
        },
      })

      const nextOrder = (openPlay?._count.players ?? 0) + 1

      const player = await tx.openPlayPlayer.create({
        data: {
          openPlayId: parsed.openPlayId,
          playerName: parsed.playerName.trim(),
          code: parsed.code,
          totalPlayTime: 3 * 60, // default to 3 hours
          skill: parsed.skill,
          order: nextOrder,
        },
      })

      EventBroadcast({
        type: BroadcastEventTypes.OPENPLAY_NEW_PLAYER,
        data: player,
      })


      //delete registration code after use
      await tx.registrationCode.delete({
        where: { id: registrationCode.id },
      })

      //if active open play then lineup directly
      if (openPlay && openPlay.status === OpenPlayStatus.active) {
        await submitLineup(tx, player.id, player.openPlayId)
        console.log(
          `Player ${player.playerName} successfully registered and added to lineup for openPlay ${player.openPlayId}`,
        )

        //update ui of all clients on openplay
        EventBroadcast({
          type: BroadcastEventTypes.OPENPLAY_UPDATED,
          data: player,
        })
        
      }

      return player
    })

    return NextResponse.json({ success: true, result: createdPlayer })
  } catch (err: any) {
    console.error("Register Open Play Player error:", err)

    if ( err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002" ) {
      const target = err.meta?.target as string[] | undefined

      if (target?.includes("playerName")) {
        return NextResponse.json(
          {
            success: false,
            error: "Player name already exists in this OpenPlay.",
          },
          { status: 400 },
        )
      }

      if (target?.includes("code")) {
        return NextResponse.json(
          {
            success: false,
            error: "Player code already exists in this OpenPlay.",
          },
          { status: 400 },
        )
      }
    }

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
