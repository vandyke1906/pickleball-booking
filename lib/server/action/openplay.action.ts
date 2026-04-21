"use server"

import { OpenPlayPlayer, QueueStatus } from "@/.config/prisma/generated/prisma"
import { prisma } from "@/lib/prisma"
import { TQueuePlayer } from "@/lib/type/openplay/openplay.type"
import { TPrismaTransaction } from "@/lib/type/util.type"
import { addMinutes, isWithinInterval } from "date-fns"

export async function createLineupEntry(tx: TPrismaTransaction, openPlayPlayer: OpenPlayPlayer):Promise<TQueuePlayer> {
  const queue = await tx.lineupQueue.create({
    data: {
      openPlayId: openPlayPlayer.openPlayId,
      playerId: openPlayPlayer.id,
      status: QueueStatus.waiting,
      scheduledAt: null,
      endedAt: null
    },
    include: { player: true, openPlay: true },
  })

  return {
    id: queue.id,
    playerId: queue.playerId,
    playerName: queue.player?.playerName || "Player",
    scheduledAt: queue.scheduledAt,
    endedAt: queue.endedAt,
  }
}

// Initialize lineup for all registered players of an OpenPlay
export async function initializeLineup(tx: TPrismaTransaction, openPlayId: string) {
  const players = await tx.openPlayPlayer.findMany({
    where: { openPlayId },
    orderBy: { registeredAt: "asc" }, // enforce registration order
  })

  if (players.length === 0) throw new Error("No available registered player!")

  const lineups = []
  for (const player of players) {
    const entry = await createLineupEntry(tx, player)
    lineups.push(entry)
  }

  return lineups
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
