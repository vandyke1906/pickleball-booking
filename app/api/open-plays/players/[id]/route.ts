import { OpenPlayStatus } from "@/.config/prisma/generated/prisma"
import { isServerAuthenticated } from "@/lib/auth/auth.server"
import { BroadcastEventTypes } from "@/lib/event-broadcaster.type"
import { prisma } from "@/lib/prisma"
import { EventBroadcast } from "@/lib/server-event/broadcaster.event"
import { withRateLimit } from "@/lib/server/rate-limiter"
import { openPlayPlayerSchema } from "@/lib/validation/open-play/open-play.validation"
import { NextRequest, NextResponse } from "next/server"

// GET Player
export const GET = withRateLimit(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await isServerAuthenticated()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
      const { id } = await params
      if (!id) return NextResponse.json({ error: "Player id is required" }, { status: 400 })

      const player = await prisma.openPlayPlayer.findUnique({ where: { id } })
      if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 })

      return NextResponse.json({ success: true, result: player })
    } catch (err: any) {
      console.error("Get Open Play Player error:", err)
      return NextResponse.json(
        { success: false, error: err.message || "Something went wrong" },
        { status: 400 },
      )
    }
  },
)

// UPDATE Player
export const PUT = withRateLimit(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await isServerAuthenticated()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
      const { id } = await params
      if (!id) return NextResponse.json({ error: "Player id is required" }, { status: 400 })

      const formData = await req.formData()
      const payload = {
        playerName: formData.get("playerName") as string,
        code: (formData.get("code") as string) || "",
        contactNumber: (formData.get("contactNumber") as string) || "",
        emailAddress: (formData.get("emailAddress") as string) || "",
      }

      const parsed = openPlayPlayerSchema.partial().parse(payload)

      // Check unique code per OpenPlay
      if (parsed.code) {
        const existing = await prisma.openPlayPlayer.findFirst({
          where: { code: parsed.code, id: { not: id } },
        })
        if (existing)
          return NextResponse.json(
            { success: false, error: "Player code already exists" },
            { status: 400 },
          )
      }

      const updated = await prisma.openPlayPlayer.update({
        where: { id },
        data: {
          playerName: parsed.playerName,
          code: parsed.code,
          contactNumber: parsed.contactNumber,
          emailAddress: parsed.emailAddress || null,
        },
        include: { openPlay: true },
      })

      //if active open play then lineup directly
      if (updated && updated.openPlay.status === OpenPlayStatus.active) {
        //update ui of all clients on openplay
        EventBroadcast({
          type: BroadcastEventTypes.OPENPLAY_UPDATE_PLAYER,
          data: updated,
        })
      }

      return NextResponse.json({ success: true, result: updated })
    } catch (err: any) {
      console.error("Update Open Play Player error:", err)
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
  },
)

// DELETE Player
export const DELETE = withRateLimit(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await isServerAuthenticated()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
      const { id } = await params
      if (!id) return NextResponse.json({ error: "Player id is required" }, { status: 400 })

      const openPlayer = await prisma.openPlayPlayer.findUnique({
        where: { id },
        include: { openPlay: true },
      })
      if (!openPlayer) return NextResponse.json({ error: "Player not found" }, { status: 400 })
      //if active open play then lineup directly
      if (openPlayer.openPlay.status === OpenPlayStatus.active) {
        //update ui of all clients on openplay
        EventBroadcast({
          type: BroadcastEventTypes.OPENPLAY_REMOVE_PLAYER,
          data: openPlayer,
        })
      }
      await prisma.openPlayPlayer.delete({ where: { id } })
      return NextResponse.json({ success: true, message: "Player deleted successfully" })
    } catch (err: any) {
      console.error("Delete Open Play Player error:", err)
      return NextResponse.json(
        { success: false, error: err.message || "Something went wrong" },
        { status: 400 },
      )
    }
  },
)
