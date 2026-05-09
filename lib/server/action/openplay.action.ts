"use server"

import { OpenPlayPlayer, PlayerSkill, Prisma, QueueStatus } from "@/.config/prisma/generated/prisma"
import { prisma } from "@/lib/prisma"
import { manager, QUEUE_KEYS } from "@/lib/server/services/queue-manager.service"
import { TCurrentGame, TQueueGroup, TQueuePlayer } from "@/lib/type/openplay/openplay.type"
import { TPrismaTransaction } from "@/lib/type/util.type"
import { formatTimeOnly } from "@/lib/utils"

async function createLineupEntries(
  tx: TPrismaTransaction,
  openPlayPlayersWithGroup: (OpenPlayPlayer & { openPlayGroupId: string })[],
): Promise<Prisma.BatchPayload> {
  return await tx.lineupQueue.createMany({
    data: openPlayPlayersWithGroup.map((p) => ({
      openPlayId: p.openPlayId,
      playerId: p.id,
      status: QueueStatus.waiting,
      openPlayGroupId: p.openPlayGroupId,
      scheduledAt: null,
      endedAt: null,
      assignedCourtId: null,
    })),
  })
}

// Initialize lineup for all registered players of an OpenPlay
export async function initializeLineup(tx: TPrismaTransaction, openPlayId: string) {
  const [players, openPlayGroups] = await Promise.all([
    tx.openPlayPlayer.findMany({
      where: { openPlayId },
      orderBy: { order: "asc" }, // enforce registration order
    }),
    tx.openPlayGroup.findMany({
      where: { openPlayId },
      select: { id: true, skills: true },
    }),
  ])

  const skillGroupMap = new Map<PlayerSkill, string>()

  for (const group of openPlayGroups) {
    manager.clearBatch(`batch:${group.id}`)
    for (const skill of group.skills) {
      skillGroupMap.set(skill, group.id)
    }
  }

  const playersGroup = players
    .filter((p) => skillGroupMap.has(p.skill))
    .map((p) => ({ ...p, openPlayGroupId: skillGroupMap.get(p.skill)! }))
  if (players.length === 0) throw new Error("No available registered player!")

  await createLineupEntries(tx, playersGroup)

  const jobs: Promise<any>[] = []
  for (const player of playersGroup) {
    jobs.push(manager.addJob(QUEUE_KEYS.LINEUP_PLAYER, player.openPlayGroupId, player))
  }

  Promise.allSettled(jobs).then((results) => {
    console.info(
      "BatchTest finished, results:",
      results.map((r, idx) => {
        if (r.status === "fulfilled") {
          const job = r.value
          const { data } = job
          return `Job ${idx + 1}: player=${data.playerName} on openPlayGroupId=${data.openPlayGroupId}, status=${r.status}`
        } else {
          return `Job ${idx + 1}: status=failed, reason=${r.reason}`
        }
      }),
    )
  })
  return true
}

export async function submitLineup(
  tx: TPrismaTransaction,
  playerId: string,
  openPlayId: string,
): Promise<void> {
  // Find the player and their court assignment
  const player = await tx.openPlayPlayer.findUnique({
    where: { id: playerId },
    include: { openPlay: true },
  })
  if (!player) throw new Error("Player not found")

  // Resolve court assignment based on skill
  const opGroup = await tx.openPlayGroup.findFirst({
    where: { openPlayId, skills: { has: player.skill } },
    select: { id: true },
  })
  if (!opGroup) throw new Error("No matching group for player skill")

  // Insert into lineupQueue
  await tx.lineupQueue.create({
    data: {
      openPlayId,
      playerId: player.id,
      status: QueueStatus.waiting,
      openPlayGroupId: opGroup.id,
      scheduledAt: null,
      endedAt: null,
      assignedCourtId: null,
    },
  })

  // Add job to manager
  await manager.addJob(QUEUE_KEYS.LINEUP_PLAYER, opGroup.id, {
    ...player,
    openPlayGroupId: opGroup.id,
  })
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

async function getCourtAvailability(openPlayId: string, tx?: TPrismaTransaction) {
  const db = tx ?? prisma

  const openPlay = await db.openPlay.findUnique({
    where: { id: openPlayId },
    include: {
      courts: { select: { id: true } },
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

  if (!openPlay) throw new Error("OpenPlay not found")

  const courtMap: Record<string, { date: Date; isFirst: boolean }> = {}

  // initialize with OpenPlay startTime
  for (const c of openPlay.courts) {
    courtMap[c.id] = { date: new Date(openPlay.startTime), isFirst: true }
  }

  // compute latest endedAt per court
  for (const q of openPlay.queues) {
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

async function getNextCourt(openPlayId: string, tx?: TPrismaTransaction) {
  const map = await getCourtAvailability(openPlayId, tx)
  return getNextAvailableCourt(map)
}

export async function scheduleGroup(group: any[], tx?: TPrismaTransaction) {
  if (!group.length) return

  const db = tx ?? prisma

  const openPlayId = group[0].openPlayId

  const { courtId: selectedCourtId, availableAt, isFirst } = await getNextCourt(openPlayId, db)

  // Load OpenPlay config (ONLY once, lightweight fetch)
  const openPlay = await db.openPlay.findUnique({
    where: { id: openPlayId },
  })

  if (!openPlay) throw new Error("OpenPlay not found")

  const { transitionMinutes, preparationSeconds } = openPlay

  // Compute schedule timing
  const playDuration = transitionMinutes * 60 * 1000
  const buffer = preparationSeconds * 1000

  const now = new Date()
  const baseStartAt = isFirst ? new Date(availableAt) : new Date(availableAt.getTime() + buffer)
  const startAt = baseStartAt > now ? baseStartAt : new Date(now.getTime() + buffer)
  const endAt = new Date(startAt.getTime() + playDuration)
  const nextAvailableAt = new Date(endAt.getTime() + buffer)

  // Persist lineup updates (single transaction-friendly block)
  const results = []

  for (const player of group) {
    const queue = await db.lineupQueue.upsert({
      where: {
        playerId_openPlayId_openPlayGroupId: {
          playerId: player.id,
          openPlayId: player.openPlayId,
          openPlayGroupId: player.openPlayGroupId,
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
        openPlayGroupId: player.openPlayGroupId,
        assignedCourtId: selectedCourtId,
        scheduledAt: startAt,
        endedAt: endAt,
        status: QueueStatus.scheduled,
      },
    })

    // Only update OpenPlayPlayer if startAt or endAt is still null
    const computedEndAt = new Date(
      (queue.scheduledAt?.getTime() ?? startAt.getTime()) + player.totalPlayTime * 60000,
    )
    // console.info(`************${JSON.stringify(player.null, 2)} -> ${startAt} = ${computedEndAt}`)

    // Only update if startAt or endAt is missing
    await db.openPlayPlayer.updateMany({
      where: {
        id: player.id,
        OR: [{ startAt: null }, { endAt: null }],
      },
      data: {
        startAt: queue.scheduledAt ?? startAt,
        endAt: computedEndAt,
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

export async function scheduleGroupsIncrementally(
  groups: any[][],
  openPlayId: string,
  tx?: TPrismaTransaction,
) {
  if (!groups.length) return []

  const db = tx ?? prisma

  // Lock per openPlayId to prevent concurrent scheduling
  return manager.withLock(`lock:openplay:${openPlayId}`, 5000, async () => {
    // Load initial court availability
    let courtMap = await getCourtAvailability(openPlayId, db)

    const results: any[] = []

    for (const group of groups) {
      if (!group.length) continue

      // Pick next available court from the *current* map
      const { courtId, availableAt, isFirst } = getNextAvailableCourt(courtMap)

      // Load OpenPlay config once
      const openPlay = await db.openPlay.findUnique({ where: { id: openPlayId } })
      if (!openPlay) throw new Error("OpenPlay not found")

      const { transitionMinutes, preparationSeconds } = openPlay
      const playDuration = transitionMinutes * 60 * 1000
      const buffer = preparationSeconds * 1000

      const now = new Date()
      const baseStartAt = isFirst ? new Date(availableAt) : new Date(availableAt.getTime() + buffer)
      const startAt = baseStartAt > now ? baseStartAt : new Date(now.getTime() + buffer)
      const endAt = new Date(startAt.getTime() + playDuration)
      const nextAvailableAt = new Date(endAt.getTime() + buffer)

      // Persist lineup updates
      const scheduledPlayers = []
      for (const player of group) {
        const queue = await db.lineupQueue.upsert({
          where: {
            playerId_openPlayId_openPlayGroupId: {
              playerId: player.id,
              openPlayId: player.openPlayId,
              openPlayGroupId: player.openPlayGroupId,
            },
          },
          update: {
            assignedCourtId: courtId,
            scheduledAt: startAt,
            endedAt: endAt,
            status: QueueStatus.scheduled,
          },
          create: {
            playerId: player.id,
            openPlayId: player.openPlayId,
            openPlayGroupId: player.openPlayGroupId,
            assignedCourtId: courtId,
            scheduledAt: startAt,
            endedAt: endAt,
            status: QueueStatus.scheduled,
          },
        })

        await db.openPlayPlayer.updateMany({
          where: { id: player.id, OR: [{ startAt: null }, { endAt: null }] },
          data: { startAt: queue.scheduledAt ?? startAt, endAt },
        })

        scheduledPlayers.push(queue)
      }

      results.push({ courtId, scheduledAt: startAt, endedAt: endAt, players: scheduledPlayers })

      // ✅ Update courtMap incrementally
      courtMap[courtId] = { date: nextAvailableAt, isFirst: false }
    }

    return results
  })
}

export async function getNewOpenPlaySchedules(
  openPlayId: string = "",
  options?: {
    tx?: any
    onGroupDone?: (game: TCurrentGame) => Promise<void>
  },
) {
  const db = options?.tx ?? prisma
  const activeOpenPlay = await db.openPlay.findUnique({
    where: { id: openPlayId },
    select: {
      id: true,
      startedAt: true,
      startTime: true,
      endTime: true,
      transitionMinutes: true,
      preparationSeconds: true,
      groups: { select: { id: true, skills: true, status: true } },
      queues: {
        orderBy: { scheduledAt: "asc" },
        select: {
          id: true,
          playerId: true,
          player: { select: { playerName: true, skill: true } },
          scheduledAt: true,
          endedAt: true,
          status: true,
          openPlayGroupId: true,
          assignedCourtId: true,
          assignedCourt: { select: { id: true, name: true } },
        },
      },
      courts: { select: { id: true, name: true } },
    },
  })

  if (!activeOpenPlay) throw new Error("OpenPlay not found")

  const now = new Date()

  const toQueuePlayer = (q: any): TQueuePlayer => ({
    id: q.id,
    openPlayId: activeOpenPlay.id,
    status: q.status ?? "waiting",
    playerId: q.playerId,
    playerName: q.player.playerName,
    skill: q.player.skill as PlayerSkill,
    openPlayGroupId: q.openPlayGroupId,
    scheduledAt: q.scheduledAt,
    endedAt: q.endedAt,
    courtName: q.assignedCourt?.name,
  })

  const waitingGroups: {
    groupId: string
    skills: PlayerSkill[]
    status: QueueStatus
    players: TQueuePlayer[]
  }[] = []

  // Build courts with currentGame and nextGame
  const courtsWithGames = activeOpenPlay.courts.map((court) => {
    const courtQueues = activeOpenPlay.queues.filter((q) => q.assignedCourtId === court.id)

    const groupsByTime: Record<number, any[]> = {}
    courtQueues.forEach((q) => {
      if (!q.scheduledAt) return
      const key = q.scheduledAt.getTime()
      if (!groupsByTime[key]) groupsByTime[key] = []
      groupsByTime[key].push(q)
    })

    const times = Object.keys(groupsByTime)
      .map(Number)
      .sort((a, b) => a - b)

    let currentGame: TCurrentGame | null = null
    const currentTime = times.find(
      (t) => t <= now.getTime() && groupsByTime[t].some((q) => !q.endedAt || q.endedAt > now),
    )
    if (currentTime) {
      currentGame = {
        courtId: court.id,
        courtName: court.name,
        players: groupsByTime[currentTime].map(toQueuePlayer),
        startTime: new Date(currentTime),
        estimatedEndTime: new Date(currentTime + activeOpenPlay.transitionMinutes * 60000),
        isPreparing: now.getTime() < currentTime + activeOpenPlay.preparationSeconds * 1000,
      }
    }

    let nextGame: TQueueGroup | null = null
    const nextTime = times.find((t) => t > now.getTime())
    if (nextTime) {
      nextGame = {
        id: `grp-${court.id}-${nextTime}`,
        courtId: court.id,
        courtName: court.name,
        players: groupsByTime[nextTime].map(toQueuePlayer),
        scheduledAt: new Date(nextTime),
        estimatedEndTime: new Date(nextTime + activeOpenPlay.transitionMinutes * 60000),
        position: 1,
      }
    }

    // Waiting groups for this court
    const excludedIds = new Set([
      ...(currentTime ? groupsByTime[currentTime].map((q) => q.id) : []),
      ...(nextTime ? groupsByTime[nextTime].map((q) => q.id) : []),
    ])
    const remaining = courtQueues.filter((q) => !excludedIds.has(q.id))

    const groupedByGroup: Record<string, TQueuePlayer[]> = {}
    remaining.forEach((q) => {
      if (!q.openPlayGroupId) return
      if (!groupedByGroup[q.openPlayGroupId]) groupedByGroup[q.openPlayGroupId] = []
      groupedByGroup[q.openPlayGroupId].push(toQueuePlayer(q))
    })

    Object.entries(groupedByGroup).forEach(([groupId, players]) => {
      const groupMeta = activeOpenPlay.groups.find((g) => g.id === groupId)
      waitingGroups.push({
        groupId,
        skills: groupMeta?.skills ?? [],
        status: groupMeta?.status ?? "waiting",
        players,
      })
    })

    return {
      id: court.id,
      name: court.name,
      currentGame,
      nextGame,
    }
  })

  // Add unscheduled players into waitingGroups
  const unscheduled = activeOpenPlay.queues.filter((q) => !q.scheduledAt && !q.endedAt)
  const unscheduledByGroup: Record<string, TQueuePlayer[]> = {}
  unscheduled.forEach((q) => {
    if (!q.openPlayGroupId) return
    if (!unscheduledByGroup[q.openPlayGroupId]) unscheduledByGroup[q.openPlayGroupId] = []
    unscheduledByGroup[q.openPlayGroupId].push(toQueuePlayer(q))
  })
  Object.entries(unscheduledByGroup).forEach(([groupId, players]) => {
    const groupMeta = activeOpenPlay.groups.find((g) => g.id === groupId)
    waitingGroups.push({
      groupId,
      skills: groupMeta?.skills ?? [],
      status: groupMeta?.status ?? "waiting",
      players,
    })
  })

  // Add groups with no players at all
  activeOpenPlay.groups.forEach((g) => {
    const hasPlayers = activeOpenPlay.queues.some((q) => q.openPlayGroupId === g.id)
    if (!hasPlayers) {
      waitingGroups.push({
        groupId: g.id,
        skills: g.skills,
        status: g.status,
        players: [],
      })
    }
  })

  // Build full queue list (future groups across all courts)
  function groupByCourtAndTime(queues: any[]): Record<string, TQueuePlayer[]> {
    const grouped: Record<string, TQueuePlayer[]> = {}
    queues.forEach((q: any) => {
      if (!q.scheduledAt) return
      const key = `${q.assignedCourt?.id ?? q.openPlayGroup?.id}-${q.scheduledAt.getTime()}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(toQueuePlayer(q))
    })
    return grouped
  }

  const queue: TQueueGroup[] = []
  const futureGrouped = groupByCourtAndTime(
    activeOpenPlay.queues.filter((q: any) => q.scheduledAt && q.scheduledAt > now),
  )
  Object.entries(futureGrouped).forEach(([key, players], idx) => {
    const [courtId, timeMs] = key.split("-")
    const scheduledAt = new Date(Number(timeMs))
    const court = activeOpenPlay.queues.find(
      (q: any) => (q.assignedCourt?.id ?? q.openPlayCourt?.id) === courtId,
    )
    if (court) {
      queue.push({
        id: `grp-${courtId}-${idx}`,
        courtId,
        courtName: court.assignedCourt?.name ?? "",
        players,
        scheduledAt,
        estimatedEndTime: new Date(
          scheduledAt.getTime() + activeOpenPlay.transitionMinutes * 60000,
        ),
        position: idx + 1,
      })
    }
  })

  //for completed games
  const currentGames: TCurrentGame[] = []
  const currentGrouped = groupByCourtAndTime(
    activeOpenPlay.queues.filter(
      (q: any) => q.scheduledAt && q.scheduledAt <= now && (!q.endedAt || q.endedAt > now),
    ),
  )
  Object.entries(currentGrouped).forEach(([key, players]) => {
    const [courtId, timeMs] = key.split("-")
    const scheduledAt = new Date(Number(timeMs))
    const court = activeOpenPlay.queues.find(
      (q: any) => (q.assignedCourt?.id ?? q.openPlayCourt?.id) === courtId,
    )
    if (court) {
      currentGames.push({
        courtId,
        courtName: court.assignedCourt?.name ?? "",
        players,
        startTime: scheduledAt,
        estimatedEndTime: new Date(
          scheduledAt.getTime() + activeOpenPlay.transitionMinutes * 60000,
        ),
        isPreparing:
          now.getTime() < scheduledAt.getTime() + activeOpenPlay.preparationSeconds * 1000,
      })
    }
  })

  // Completed games
  const completedGames: TCurrentGame[] = []
  const completedGrouped = groupByCourtAndTime(
    activeOpenPlay.queues.filter((q: any) => q.endedAt && q.endedAt <= now),
  )
  Object.entries(completedGrouped).forEach(([key, players]) => {
    const [courtId, timeMs] = key.split("-")
    const scheduledAt = new Date(Number(timeMs))
    const court = activeOpenPlay.queues.find(
      (q: any) => (q.assignedCourt?.id ?? q.openPlayCourt?.id) === courtId,
    )
    if (court) {
      completedGames.push({
        courtId,
        courtName: court.assignedCourt?.name ?? "",
        players,
        startTime: scheduledAt,
        estimatedEndTime: new Date(
          scheduledAt.getTime() + activeOpenPlay.transitionMinutes * 60000,
        ),
        isPreparing: false,
      })
    }
  })

  // Fire callback for completed games
  if (options?.onGroupDone) {
    await Promise.all(completedGames.map((game) => options.onGroupDone?.(game)))
  }

  // Compute nextTransition from courtsWithGames
  let nextTransition: Date | null = null
  const nextTimes = courtsWithGames
    .map((c: any) => c.nextGame?.scheduledAt)
    .filter((d: any): d is Date => !!d)

  if (nextTimes.length > 0) {
    const earliest = Math.min(...nextTimes.map((d: any) => d.getTime()))
    nextTransition = new Date(earliest)
  }

  return {
    isStarted: !!activeOpenPlay.startedAt,
    openPlay: activeOpenPlay,
    timeRange: `${formatTimeOnly(activeOpenPlay.startTime.toISOString())} - ${formatTimeOnly(activeOpenPlay.endTime.toISOString())}`,
    courts: courtsWithGames,
    waitingGroups,
    queues: queue,
    currentGames,
    nextTransition,
  }
}

export async function getOpenPlaySchedules(
  openPlayId: string = "",
  options?: {
    tx?: any
    onGroupDone?: (game: TCurrentGame) => void
  },
) {
  const db = options?.tx ?? prisma
  const activeOpenPlay = await db.openPlay.findUnique({
    where: { id: openPlayId },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      isCompleted: true,
      startedAt: true,
      transitionMinutes: true,
      announcementMinutesBeforeTransition: true,
      preparationSeconds: true,
      organizationId: true,
      createdAt: true,
      updatedAt: true,
      status: true,
      queues: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          playerId: true,
          player: { select: { playerName: true } },
          scheduledAt: true,
          endedAt: true,
          status: true,
          openPlayGroupId: true,
          openPlayGroup: { select: { id: true } },
          assignedCourtId: true,
          assignedCourt: { select: { id: true, name: true } },
        },
      },
      courts: { select: { id: true, name: true } },
    },
  })

  if (!activeOpenPlay) throw new Error("OpenPlay not found")

  const now = new Date()

  // Map queue record into TQueuePlayer
  const toQueuePlayer = (q: any): TQueuePlayer => ({
    id: q.id,
    openPlayId: activeOpenPlay.id,
    status: q.status ?? "waiting",
    openPlayGroupId: q.openPlayGroupId,
    playerId: q.playerId,
    playerName: q.player.playerName,
    skill: q.player.skill as PlayerSkill,
    scheduledAt: q.scheduledAt,
    endedAt: q.endedAt,
  })

  // Group players by court + scheduledAt
  function groupByCourtAndTime(queues: any[]): Record<string, TQueuePlayer[]> {
    const grouped: Record<string, TQueuePlayer[]> = {}
    queues.forEach((q: any) => {
      if (!q.scheduledAt) return
      const key = `${q.assignedCourt?.id ?? q.openPlayGroup?.id}-${q.scheduledAt.getTime()}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(toQueuePlayer(q))
    })
    return grouped
  }

  // Current games
  const currentGames: TCurrentGame[] = []
  const currentGrouped = groupByCourtAndTime(
    activeOpenPlay.queues.filter(
      (q: any) => q.scheduledAt && q.scheduledAt <= now && (!q.endedAt || q.endedAt > now),
    ),
  )
  Object.entries(currentGrouped).forEach(([key, players]) => {
    const [courtId, timeMs] = key.split("-")
    const scheduledAt = new Date(Number(timeMs))
    const court = activeOpenPlay.queues.find(
      (q: any) => (q.assignedCourt?.id ?? q.openPlayCourt?.id) === courtId,
    )
    if (court) {
      currentGames.push({
        courtId,
        courtName: court.assignedCourt?.name ?? "",
        players,
        startTime: scheduledAt,
        estimatedEndTime: new Date(
          scheduledAt.getTime() + activeOpenPlay.transitionMinutes * 60000,
        ),
        isPreparing:
          now.getTime() < scheduledAt.getTime() + activeOpenPlay.preparationSeconds * 1000,
      })
    }
  })

  // Completed games
  const completedGames: TCurrentGame[] = []
  const completedGrouped = groupByCourtAndTime(
    activeOpenPlay.queues.filter((q: any) => q.endedAt && q.endedAt <= now),
  )
  Object.entries(completedGrouped).forEach(([key, players]) => {
    const [courtId, timeMs] = key.split("-")
    const scheduledAt = new Date(Number(timeMs))
    const court = activeOpenPlay.queues.find(
      (q: any) => (q.assignedCourt?.id ?? q.openPlayCourt?.id) === courtId,
    )
    if (court) {
      completedGames.push({
        courtId,
        courtName: court.assignedCourt?.name ?? "",
        players,
        startTime: scheduledAt,
        estimatedEndTime: new Date(
          scheduledAt.getTime() + activeOpenPlay.transitionMinutes * 60000,
        ),
        isPreparing: false,
      })
    }
  })

  // Queue (future groups)
  const queue: TQueueGroup[] = []
  const futureGrouped = groupByCourtAndTime(
    activeOpenPlay.queues.filter((q: any) => q.scheduledAt && q.scheduledAt > now),
  )
  Object.entries(futureGrouped).forEach(([key, players], idx) => {
    const [courtId, timeMs] = key.split("-")
    const scheduledAt = new Date(Number(timeMs))
    const court = activeOpenPlay.queues.find(
      (q: any) => (q.assignedCourt?.id ?? q.openPlayCourt?.id) === courtId,
    )
    if (court) {
      queue.push({
        id: `grp-${courtId}-${idx}`,
        courtId,
        courtName: court.assignedCourt?.name ?? "",
        players,
        scheduledAt,
        estimatedEndTime: new Date(
          scheduledAt.getTime() + activeOpenPlay.transitionMinutes * 60000,
        ),
        position: idx + 1,
      })
    }
  })

  // Waiting players: no scheduledAt yet
  const waitingPlayers: TQueuePlayer[] = activeOpenPlay.queues
    .filter((q: any) => !q.scheduledAt && !q.endedAt)
    .map(toQueuePlayer)

  // Next transition
  let nextTransition: Date | null = null
  if (queue.length > 0) {
    nextTransition = new Date(Math.min(...queue.map((g) => g.scheduledAt.getTime())))
  }

  // Fire callback for completed games
  if (options?.onGroupDone) {
    completedGames.forEach((game) => options.onGroupDone?.(game))
  }

  return {
    isStarted: !!activeOpenPlay.startedAt,
    openPlay: activeOpenPlay,
    currentGames,
    queue,
    completedGames,
    waitingPlayers,
    nextTransition,
  }
}
