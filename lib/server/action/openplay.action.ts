"use server"

import { OpenPlayPlayer, PlayerSkill, Prisma, QueueStatus } from "@/.config/prisma/generated/prisma"
import { prisma } from "@/lib/prisma"
import { manager, QUEUE_KEYS } from "@/lib/server/services/queue-manager.service"
import { TPrismaTransaction } from "@/lib/type/util.type"

export async function createLineupEntries(
  tx: TPrismaTransaction,
  openPlayPlayersWithCourt: (OpenPlayPlayer & { openPlayCourtId: string })[],
): Promise<Prisma.BatchPayload> {
  return await tx.lineupQueue.createMany({
    data: openPlayPlayersWithCourt.map((p) => ({
      openPlayId: p.openPlayId,
      playerId: p.id,
      status: QueueStatus.waiting,
      openPlayCourtId: p.openPlayCourtId,
      scheduledAt: null,
      endedAt: null,
    })),
  })
}

// Initialize lineup for all registered players of an OpenPlay
export async function initializeLineup(tx: TPrismaTransaction, openPlayId: string) {
  const [players, courts] = await Promise.all([
    tx.openPlayPlayer.findMany({
      where: { openPlayId },
      orderBy: { registeredAt: "asc" }, // enforce registration order
    }),
    tx.openPlayCourt.findMany({
      where: { openPlayId },
      select: { id: true, skills: true },
    }),
  ])

  const skillCourtMap = new Map<PlayerSkill, string>()

  for (const court of courts) {
    manager.clearBatch(`batch:${court.id}`)
    for (const skill of court.skills) {
      skillCourtMap.set(skill, court.id)
    }
  }

  const playersWithCourt = players
    .filter((p) => skillCourtMap.has(p.skill))
    .map((p) => ({ ...p, openPlayCourtId: skillCourtMap.get(p.skill)! }))
  if (players.length === 0) throw new Error("No available registered player!")

  await createLineupEntries(tx, playersWithCourt)

  const jobs: Promise<any>[] = []
  for (const player of playersWithCourt) {
    jobs.push(manager.addJob(QUEUE_KEYS.LINEUP_PLAYER, player.openPlayCourtId, player))
  }

  Promise.allSettled(jobs).then((results) => {
    console.info(
      "BatchTest finished, results:",
      results.map((r, idx) => {
        if (r.status === "fulfilled") {
          const job = r.value
          const { data } = job
          return `Job ${idx + 1}: player=${data.playerName} on openPlayCourtId=${data.openPlayCourtId}, status=fulfilled`
        } else {
          return `Job ${idx + 1}: status=failed, reason=${r.reason}`
        }
      }),
    )
  })
  return true
}

// Check if player still has allowance based on elapsed time
export async function canJoinQueue(player: OpenPlayPlayer, currentTime: Date): Promise<boolean> {
  if (!player.startAt) return true // first time joining
  const elapsedMinutes = Math.floor((currentTime.getTime() - player.startAt.getTime()) / 60000)
  return elapsedMinutes < player.totalPlayTime
}

export async function deleteQueuedPlayers(playerIds: string[] = []) {
  if (!playerIds.length) return { count: 0 }
  try {
    return await prisma.$transaction(async (tx) => {
      const result = await tx.lineupQueue.deleteMany({
        where: {
          playerId: {
            in: playerIds,
          },
        },
      })

      return result
    })
  } catch (error) {
    console.error("Failed to delete queued players:", error)
    throw error
  }
}
