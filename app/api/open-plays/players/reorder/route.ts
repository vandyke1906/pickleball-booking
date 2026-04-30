import { isServerAuthenticated } from "@/lib/auth/auth.server"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { withRateLimit } from "@/lib/server/rate-limiter"

export const PUT = withRateLimit(async (req: NextRequest) => {
  const session = await isServerAuthenticated()
  if (!session?.user) {
    return NextResponse.json({ error: "Action not allowed" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { playerIds } = body

    const updatedPlayers = await prisma.$transaction(
      playerIds.map((id: string, index: number) =>
        prisma.openPlayPlayer.update({
          where: { id },
          data: { order: index + 1 },
        }),
      ),
    )

    // // Broadcast update to clients
    // EventBroadcast({
    //   type: BroadcastEventTypes.OPENPLAY_UPDATED,
    //   data: { openPlayId, players: updatedPlayers },
    // })

    return NextResponse.json({ success: true, result: updatedPlayers })
  } catch (err: any) {
    console.error("Reorder Open Play Players error:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Something went wrong" },
      { status: 400 },
    )
  }
})
