"use server"

import { OpenPlayPlayer, QueueStatus } from "@/.config/prisma/generated/prisma"
import { prisma } from "@/lib/prisma"
import { TPrismaTransaction } from "@/lib/type/util.type"
import { addMinutes, isWithinInterval } from "date-fns"

export async function createLineupEntry(tx: TPrismaTransaction, openPlayPlayer: OpenPlayPlayer) {
  const queue = await tx.lineupQueue.create({
    data: {
      openPlayId: openPlayPlayer.openPlayId,
      playerId: openPlayPlayer.id,
      status: QueueStatus.waiting,
      scheduledAt: null,
    },
    include: { player: true, openPlay: true },
  })

  console.info({ queue })

  if (!openPlayPlayer?.startAt && queue?.openPlay?.startTime && queue?.openPlay?.endTime) {
    const { startAt } = await resolveOpenPlayPlayerSchedule({
      queueCreatedAt: queue.createdAt,
      openPlayStartTime: queue.openPlay.startTime,
      openPlayEndTime: queue.openPlay.endTime,
      durationMinutes: openPlayPlayer.totalPlayTime,
    })

    await tx.openPlayPlayer.update({
      where: { id: openPlayPlayer.id },
      data: {
        startAt: startAt,
        endAt: addMinutes(startAt, openPlayPlayer.totalPlayTime),
      },
    })
  }

  return queue
}

// Initialize lineup for all registered players of an OpenPlay
export async function initializeLineup(tx: any, openPlayId: string) {
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

/**
 * Resolves the correct startAt and endAt for OpenPlayPlayer
 */
export async function resolveOpenPlayPlayerSchedule({
  queueCreatedAt,
  openPlayStartTime,
  openPlayEndTime,
  durationMinutes,
}: {
  queueCreatedAt: Date
  openPlayStartTime: Date
  openPlayEndTime: Date
  durationMinutes: number
}) {
  const isWithinOpenPlay = openPlayEndTime
    ? isWithinInterval(queueCreatedAt, {
        start: openPlayStartTime,
        end: openPlayEndTime,
      })
    : queueCreatedAt >= openPlayStartTime

  const startAt = isWithinOpenPlay ? queueCreatedAt : openPlayStartTime
  const endAt = addMinutes(startAt, durationMinutes)

  return { startAt, endAt }
}

// Check if player still has allowance based on elapsed time
export async function canJoinQueue(player: OpenPlayPlayer, currentTime: Date): Promise<boolean> {
  if (!player.startAt) return true // first time joining
  const elapsedMinutes = Math.floor((currentTime.getTime() - player.startAt.getTime()) / 60000)
  return elapsedMinutes < player.totalPlayTime
}

export async function deleteQueuedPlayers(queueIds: string[] = []) {
  if (!queueIds.length) {
    return { count: 0 }
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const result = await tx.lineupQueue.deleteMany({
        where: {
          id: {
            in: queueIds,
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

// Assign a new queue slot for the player
// export function assignQueueSlot(
//   player: OpenPlayPlayer,
//   openPlay: OpenPlay,
//   slotStart: Date,
// ): LineupQueue | null {
//   if (!canJoinQueue(player, slotStart)) return null

//   const slotEnd = new Date(slotStart.getTime() + openPlay.transitionMinutes * 60000)

//   if (!player.startAt) player.startAt = slotStart
//   player.endAt = slotEnd

//   return {
//     id: crypto.randomUUID(),
//     playerId: player.id,
//     status: QueueStatus.waiting,
//     scheduledAt: slotStart,
//     createdAt: new Date(),
//     updatedAt: new Date(),
//   }
// }

// // Queue manager: update statuses based on current time
// export function updateQueueStatuses(
//   queues: LineupQueue[],
//   openPlay: OpenPlay,
//   currentTime: Date,
// ): LineupQueue[] {
//   return queues.map((queue) => {
//     const slotEnd = new Date(queue.scheduledAt.getTime() + openPlay.transitionMinutes * 60000)

//     if (currentTime < queue.scheduledAt) {
//       return { ...queue, status: QueueStatus.waiting }
//     } else if (currentTime >= queue.scheduledAt && currentTime < slotEnd) {
//       return { ...queue, status: QueueStatus.playing }
//     } else {
//       return { ...queue, status: QueueStatus.finished }
//     }
//   })
// }
