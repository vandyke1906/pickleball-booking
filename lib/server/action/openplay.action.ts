"use server"

import {
  LineupQueue,
  OpenPlay,
  OpenPlayPlayer,
  QueueStatus,
} from "@/.config/prisma/generated/prisma"

export async function createLineupEntry(tx: any, openPlayPlayer: OpenPlayPlayer) {
  return await tx.lineupQueue.create({
    data: {
      playerId: openPlayPlayer.id,
      status: QueueStatus.waiting,
      scheduledAt: null,
    },
    include: { player: true },
  })
}

// Initialize lineup for all registered players of an OpenPlay
export async function initializeLineup(tx: any, openPlayId: string) {
  const players = await tx.openPlayPlayer.findMany({
    where: { openPlayId },
    orderBy: { createdAt: "asc" }, // enforce registration order
  })

  if (players.length === 0) return []

  const lineups = []
  for (const player of players) {
    const entry = await createLineupEntry(tx, player)
    lineups.push(entry)
  }

  return lineups
}

// Check if player still has allowance based on elapsed time
function canJoinQueue(player: OpenPlayPlayer, currentTime: Date): boolean {
  if (!player.startAt) return true // first time joining
  const elapsedMinutes = Math.floor((currentTime.getTime() - player.startAt.getTime()) / 60000)
  return elapsedMinutes < player.totalPlayTime
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
