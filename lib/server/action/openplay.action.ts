"use server"

import { OpenPlayPlayer, PlayerSkill, Prisma, QueueStatus } from "@/.config/prisma/generated/prisma"
import { prisma } from "@/lib/prisma"
import { manager, QUEUE_KEYS } from "@/lib/server/services/queue-manager.service"
import { TPrismaTransaction } from "@/lib/type/util.type"

async function createLineupEntries(
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
      assignedCourtId: null,
    })),
  })
}

// Initialize lineup for all registered players of an OpenPlay
export async function initializeLineup(tx: TPrismaTransaction, openPlayId: string) {
  const [players, openPlaycourts] = await Promise.all([
    tx.openPlayPlayer.findMany({
      where: { openPlayId },
      orderBy: { registeredAt: "asc" }, // enforce registration order
    }),
    tx.openPlayCourt.findMany({
      where: { openPlayId },
      select: { id: true, skills: true, courts: { select: { id: true, name: true } } },
    }),
  ])

  const skillCourtMap = new Map<PlayerSkill, string>()

  for (const opCourt of openPlaycourts) {
    manager.clearBatch(`batch:${opCourt.id}`)
    for (const skill of opCourt.skills) {
      skillCourtMap.set(skill, opCourt.id)
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

async function getCourtAvailability(openPlayCourtId: string, tx?: TPrismaTransaction) {
  const db = tx ?? prisma
  const openPlayCourt = await db.openPlayCourt.findUnique({
    where: { id: openPlayCourtId },
    include: {
      openPlay: true,
      courts: true,
      queues: {
        where: {
          status: QueueStatus.scheduled,
        },
        select: {
          assignedCourtId: true,
          endedAt: true,
        },
      },
    },
  })

  if (!openPlayCourt) throw new Error("OpenPlayCourt not found")

  const courtMap: Record<string, { date: Date; isFirst: boolean }> = {}

  // initialize with OpenPlay startTime
  for (const c of openPlayCourt.courts) {
    courtMap[c.id] = { date: new Date(openPlayCourt.openPlay.startTime), isFirst: true }
  }

  // compute latest endedAt per court
  for (const q of openPlayCourt.queues) {
    if (q.assignedCourtId && q.endedAt) {
      const current = courtMap[q.assignedCourtId]

      if (!current || q.endedAt > current.date) {
        courtMap[q.assignedCourtId] = { date: q.endedAt, isFirst: false }
      }
    }
  }

  return courtMap
}

function getNextAvailableCourt(courtMap: Record<string, { date: Date; isFirst: boolean }>) {
  const sorted = Object.entries(courtMap).sort(
    (a: any, b: any) => a[1].date.getTime() - b[1].date.getTime(),
  )
  const [courtId, { date, isFirst }] = sorted[0]
  return { courtId, availableAt: date, isFirst }
}

async function getNextCourt(openPlayCourtId: string, tx?: TPrismaTransaction) {
  const map = await getCourtAvailability(openPlayCourtId, tx)
  return getNextAvailableCourt(map)
}

export async function scheduleGroup(group: any[], tx?: TPrismaTransaction) {
  if (!group.length) return

  const db = tx ?? prisma

  const openPlayCourtId = group[0].openPlayCourtId

  // // 1. Get court availability (REUSABLE)
  // const courtMap = await getCourtAvailability(openPlayCourtId, db)

  // // 2. Pick next available court (REUSABLE)
  // const { courtId: selectedCourtId, availableAt } = getNextAvailableCourt(courtMap)

  const { courtId: selectedCourtId, availableAt, isFirst } = await getNextCourt(openPlayCourtId, db)

  // 3. Load OpenPlay config (ONLY once, lightweight fetch)
  const openPlayCourt = await db.openPlayCourt.findUnique({
    where: { id: openPlayCourtId },
    include: {
      openPlay: true,
    },
  })

  if (!openPlayCourt) throw new Error("OpenPlayCourt not found")

  const { transitionMinutes, preparationSeconds } = openPlayCourt.openPlay

  // 4. Compute schedule timing
  const playDuration = transitionMinutes * 60 * 1000
  const buffer = preparationSeconds * 1000

  const startAt = isFirst ? new Date(availableAt) : new Date(availableAt.getTime() + buffer)
  const endAt = new Date(startAt.getTime() + playDuration)
  const nextAvailableAt = new Date(endAt.getTime() + buffer)

  // 5. Persist lineup updates (single transaction-friendly block)
  const results = []

  for (const player of group) {
    const queue = await db.lineupQueue.upsert({
      where: {
        playerId_openPlayId_openPlayCourtId: {
          playerId: player.id,
          openPlayId: player.openPlayId,
          openPlayCourtId: player.openPlayCourtId,
        },
      },
      update: {
        assignedCourtId: selectedCourtId,
        scheduledAt: startAt,
        endedAt: endAt,
        status: QueueStatus.scheduled,
      },
      create: {
        playerId: player.id,
        openPlayId: player.openPlayId,
        openPlayCourtId: player.openPlayCourtId,
        assignedCourtId: selectedCourtId,
        scheduledAt: startAt,
        endedAt: endAt,
        status: QueueStatus.scheduled,
      },
    })

    results.push(queue)
  }

  return {
    courtId: selectedCourtId,
    scheduledAt: startAt,
    endedAt: endAt,
    nextAvailableAt,
    players: results,
  }
}
