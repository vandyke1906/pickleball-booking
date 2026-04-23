import { QueueStatus } from "@/.config/prisma/generated/prisma"
import { prisma } from "@/lib/prisma"
import {
  TQueuePlayer,
  TCurrentGame,
  TQueueGroup,
  TQueueOpenPlay,
  TQueueCourt,
} from "@/lib/type/openplay/openplay.type"
import { TPrismaTransaction } from "@/lib/type/util.type"

export class QueueManager {
  private openPlay: TQueueOpenPlay | null = null
  constructor(private openPlayId: string) {}

  public async initializeData(prismaTransaction?: TPrismaTransaction) {
    const db = prismaTransaction ?? prisma
    const activeOpenPlay = await db.openPlay.findUnique({
      where: { id: this.openPlayId },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        isActive: true,
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
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            playerId: true,
            player: true,
            scheduledAt: true,
            endedAt: true,
            courtId: true,
          },
        },
        courts: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!activeOpenPlay) throw new Error("No active Open Play found")

    const data: TQueueOpenPlay = {
      id: activeOpenPlay.id,
      isActive: activeOpenPlay.isActive,
      startedAt: activeOpenPlay.startedAt,
      isCompleted: activeOpenPlay.isCompleted,
      startTime: activeOpenPlay.startTime,
      endTime: activeOpenPlay.endTime,
      transitionMinutes: activeOpenPlay.transitionMinutes,
      preparationSeconds: activeOpenPlay.preparationSeconds,
      announcementMinutesBeforeTransition: activeOpenPlay.announcementMinutesBeforeTransition,
      status: activeOpenPlay.status,
      organizationId: activeOpenPlay.organizationId,
      createdAt: activeOpenPlay.createdAt,
      updatedAt: activeOpenPlay.updatedAt,
      queuePlayers: activeOpenPlay.queues.map((q) => ({
        id: q.id,
        playerId: q.playerId,
        playerName: q.player.playerName,
        scheduledAt: q.scheduledAt,
        endedAt: q.endedAt,
        courtId: q.courtId,
      })),
      courts: activeOpenPlay.courts.map((c) => ({ id: c.id, name: c.name })),
    }

    this.openPlay = data
    return data
  }

  /** FIFO chunking into groups of 4 */
  private chunkPlayers(players: TQueuePlayer[], size: number = 4): TQueuePlayer[][] {
    const result: TQueuePlayer[][] = []
    let queue: TQueuePlayer[] = []

    for (const p of players) {
      queue.push(p)
      if (queue.length === size) {
        result.push(queue)
        queue = []
      }
    }
    if (queue.length > 0) result.push(queue)
    return result
  }

  /** Unified schedule state builder */
  private getScheduleState(
    currentGames: TCurrentGame[],
    queue: TQueueGroup[],
    completedGames: TCurrentGame[],
    nextTransition: Date | null,
    waitingPlayers: TQueuePlayer[] = [],
  ) {
    if (!this.openPlay) throw new Error("No available Open Play Data")
    return {
      isStarted: !!this.openPlay.startedAt,
      openPlay: this.openPlay,
      currentGames,
      queue,
      completedGames,
      waitingPlayers,
      nextTransition,
    }
  }

  /** Initialize schedule based on FIFO players */
  public initializeSchedule(): {
    scheduledGroups: TQueueGroup[]
    waitingPlayers: TQueuePlayer[]
  } {
    const { openPlay } = this
    if (!openPlay) throw new Error("No available Open Play Data")

    if (!openPlay.startedAt) {
      return { scheduledGroups: [], waitingPlayers: openPlay.queuePlayers }
    }

    const GAME_MS = openPlay.transitionMinutes * 60_000
    const PREPARATION_MS = openPlay.preparationSeconds * 1_000
    const SLOT_DURATION_MS = GAME_MS + PREPARATION_MS

    const startTime = new Date(openPlay.startedAt)
    const players = openPlay.queuePlayers
    const courts = openPlay.courts
    const groups = this.chunkPlayers(players, 4)
    const courtsCount = courts.length

    const scheduledGroups: TQueueGroup[] = []
    let waitingPlayers: TQueuePlayer[] = []

    for (let slot = 0; slot * courtsCount < groups.length; slot++) {
      const scheduledAt = new Date(startTime.getTime() + slot * SLOT_DURATION_MS)
      const gameEndTime = new Date(scheduledAt.getTime() + GAME_MS)

      for (let ci = 0; ci < courtsCount; ci++) {
        const gi = slot * courtsCount + ci
        if (gi >= groups.length) break

        const g = groups[gi]
        if (g.length < 4) {
          waitingPlayers = g
          break
        }

        const group = groups[gi]

        if (group.length < 4) {
          // Not enough players → waiting list
          waitingPlayers.push(...group)
          continue
        }

        scheduledGroups.push({
          id: `grp-${courts[ci].id}-${scheduledAt.getTime()}`,
          courtId: courts[ci].id,
          courtName: courts[ci].name,
          players: g.map((p) => ({ ...p, scheduledAt })),
          scheduledAt,
          estimatedEndTime: gameEndTime,
          position: gi + 1,
        })
      }
    }

    return { scheduledGroups, waitingPlayers }
  }

  /** Promote the current waiting group into a scheduled group */
 private promoteWaitingGroup(now: Date = new Date()): TQueueGroup | null {
  const { openPlay } = this
  if (!openPlay) throw new Error("No available Open Play Data")

  const GAME_MS = openPlay.transitionMinutes * 60_000
  const PREPARATION_MS = openPlay.preparationSeconds * 1_000

  // 1. Get the first 4 players who don't have a courtId/scheduledAt
  const waitingGroup = this.getWaitingGroup() 
  if (!waitingGroup) return null

  // 2. Find the earliest available court
  let earliestCourt = openPlay.courts[0]
  let earliestAvailableTime = Infinity

  for (const court of openPlay.courts) {
    // Find the latest game scheduled on this court
    const lastPlayerOnCourt = openPlay.queuePlayers
      .filter((p) => p.courtId === court.id && p.scheduledAt)
      .sort((a, b) => b.scheduledAt!.getTime() - a.scheduledAt!.getTime())[0]

    let availableAt: number
    if (lastPlayerOnCourt && lastPlayerOnCourt.scheduledAt) {
      // Court becomes available after current game + transition
      availableAt = lastPlayerOnCourt.scheduledAt.getTime() + GAME_MS + PREPARATION_MS
    } else {
      // Court is currently empty
      availableAt = now.getTime()
    }

    if (availableAt < earliestAvailableTime) {
      earliestAvailableTime = availableAt
      earliestCourt = court
    }
  }

  // 3. Finalize timing (Ensure we don't schedule in the past relative to 'now')
  const scheduledAt = new Date(Math.max(earliestAvailableTime, now.getTime()))
  const estimatedEndTime = new Date(scheduledAt.getTime() + GAME_MS)

  // 4. IMPORTANT: Update the actual player data in the queue
  // This "assigns" them so they aren't picked up by getWaitingGroup() again
  const playerIds = new Set(waitingGroup.players.map(p => p.id))
  openPlay.queuePlayers.forEach(p => {
    if (playerIds.has(p.id)) {
      p.courtId = earliestCourt.id
      p.scheduledAt = scheduledAt
    }
  })

  // 5. Return the group for UI/State tracking
  return {
    id: `grp-${earliestCourt.id}-${scheduledAt.getTime()}`,
    courtId: earliestCourt.id,
    courtName: earliestCourt.name,
    players: waitingGroup.players.map((p) => ({ 
      ...p, 
      courtId: earliestCourt.id, 
      scheduledAt 
    })),
    scheduledAt,
    estimatedEndTime,
    position: waitingGroup.position,
  }
}


  /** Compute current state with callbacks */
  // public compute(
  //   options: {
  //     now?: Date
  //     onGroupDone?: (game: TCurrentGame) => void
  //     onPlayerDone?: (player: TQueuePlayer) => void
  //     completedPlayerIds?: Set<string>
  //   } = {},
  // ) {
  //   const { openPlay } = this
  //   if (!openPlay) throw new Error("No available Open Play Data")
  //   const now = options.now ?? new Date()
  //   const onGroupDone = options.onGroupDone
  //   const onPlayerDone = options.onPlayerDone
  //   const completedPlayerIds = options.completedPlayerIds ?? new Set<string>()

  //   if (!openPlay.startedAt) 
  //     return this.getScheduleState([], [], [], null, openPlay.queuePlayers)

  //   const GAME_MS = openPlay.transitionMinutes * 60_000
  //   const PREPARATION_MS = openPlay.preparationSeconds * 1_000
  //   const SLOT_DURATION_MS = GAME_MS + PREPARATION_MS

  //   // Remove completed players entirely
  //   const players = openPlay.queuePlayers.filter((p) => !completedPlayerIds.has(p.id))
  //   const courts = openPlay.courts
  //   const groups = this.chunkPlayers(players, 4) // FIFO chunking
  //   const courtsCount = courts.length

  //   const currentGames: TCurrentGame[] = []
  //   const queue: TQueueGroup[] = []
  //   const completedGames: TCurrentGame[] = []
  //   let waitingPlayers: TQueuePlayer[] = []

  //   for (let slot = 0; slot * courtsCount < groups.length; slot++) {
  //     for (let ci = 0; ci < courtsCount; ci++) {
  //       const gi = slot * courtsCount + ci
  //       if (gi >= groups.length) break

  //       const g = groups[gi]
  //       if (g.length < 4) {
  //         waitingPlayers = g
  //         break
  //       }

  //       // Determine scheduledAt: use players’ scheduledAt if available, else fallback
  //       const scheduledAt =
  //         g[0].scheduledAt ?? (openPlay.startedAt ? new Date(openPlay.startedAt) : now)

  //       const gameEndTime = new Date(scheduledAt.getTime() + GAME_MS)
  //       const slotEndTime = new Date(scheduledAt.getTime() + SLOT_DURATION_MS)

  //       const annotated = g.map((p) => ({ ...p, scheduledAt }))

  //       if (now >= gameEndTime) {
  //         const finished: TCurrentGame = {
  //           courtId: courts[ci].id,
  //           courtName: courts[ci].name,
  //           players: annotated,
  //           startTime: scheduledAt,
  //           estimatedEndTime: gameEndTime,
  //           isPreparing: false,
  //         }
  //         completedGames.push(finished)
  //         if (onGroupDone) onGroupDone(finished)
  //         if (onPlayerDone) annotated.forEach((p) => onPlayerDone(p))
  //       } else if (now >= scheduledAt && now < gameEndTime) {
  //         currentGames.push({
  //           courtId: courts[ci].id,
  //           courtName: courts[ci].name,
  //           players: annotated,
  //           startTime: scheduledAt,
  //           estimatedEndTime: gameEndTime,
  //           isPreparing: now > gameEndTime && now < slotEndTime,
  //         })
  //       } else {
  //         queue.push({
  //           id: `grp-${courts[ci].id}-${scheduledAt.getTime()}`,
  //           courtId: courts[ci].id,
  //           courtName: courts[ci].name,
  //           players: annotated,
  //           scheduledAt,
  //           estimatedEndTime: gameEndTime,
  //           position: gi + 1,
  //         })
  //       }
  //     }
  //   }

  //   let nextTransition: Date | null = null
  //   if (currentGames.length > 0) {
  //     nextTransition = currentGames
  //       .map((g) => g.estimatedEndTime)
  //       .sort((a, b) => a.getTime() - b.getTime())[0]
  //   } else if (queue.length > 0) {
  //     nextTransition = queue[0].scheduledAt
  //   }

  //   return this.getScheduleState(
  //     currentGames,
  //     queue,
  //     completedGames,
  //     nextTransition,
  //     waitingPlayers,
  //   )
  // }

  // public compute(
  //   options: {
  //     now?: Date
  //     onGroupDone?: (game: TCurrentGame) => void
  //     onPlayerDone?: (player: TQueuePlayer) => void
  //     completedPlayerIds?: Set<string>
  //   } = {},
  // ) {
  //   const { openPlay } = this
  //   if (!openPlay) throw new Error("No available Open Play Data")

  //   const now = options.now ?? new Date()
  //   const onGroupDone = options.onGroupDone
  //   const onPlayerDone = options.onPlayerDone
  //   const completedPlayerIds = options.completedPlayerIds ?? new Set<string>()

  //   if (!openPlay.startedAt) {
  //     return this.getScheduleState([], [], [], null, openPlay.queuePlayers)
  //   }

  //   const GAME_MS = openPlay.transitionMinutes * 60_000
  //   const PREPARATION_MS = openPlay.preparationSeconds * 1_000
  //   const SLOT_DURATION_MS = GAME_MS + PREPARATION_MS

  //   // Remove completed players entirely
  //   const players = openPlay.queuePlayers.filter((p) => !completedPlayerIds.has(p.id))
  //   const groups = this.chunkPlayers(players, 4) // FIFO chunking

  //   const currentGames: TCurrentGame[] = []
  //   const queue: TQueueGroup[] = []
  //   const completedGames: TCurrentGame[] = []
  //   let waitingPlayers: TQueuePlayer[] = []

  //   for (let gi = 0; gi < groups.length; gi++) {
  //     const g = groups[gi]
  //     if (g.length < 4) {
  //       waitingPlayers = g
  //       break
  //     }

  //     // ✅ Court consistency check
  //     const courtIds = new Set(g.map(p => p.courtId))
  //     console.info({g})
  //     if (courtIds.size !== 1) {
  //       throw new Error(`Group ${gi} has players from multiple courts: ${[...courtIds].join(", ")}`)
  //     }
  //     const courtId = g[0].courtId
  //     const court = openPlay.courts.find(c => c.id === courtId)
  //     if (!court) throw new Error(`Court ${courtId} not found`)

  //     // ✅ Schedule consistency check
  //     const scheduleTimes = g.map(p => p.scheduledAt).filter(Boolean) as Date[]
  //     let scheduledAt: Date
  //     if (scheduleTimes.length > 0) {
  //       const first = scheduleTimes[0].getTime()
  //       const allSame = scheduleTimes.every(t => t.getTime() === first)
  //       if (!allSame) {
  //         throw new Error(`Group ${gi} has inconsistent scheduledAt values`)
  //       }
  //       scheduledAt = scheduleTimes[0]
  //     } else {
  //       scheduledAt = openPlay.startedAt ? new Date(openPlay.startedAt) : now
  //     }

  //     const gameEndTime = new Date(scheduledAt.getTime() + GAME_MS)
  //     const slotEndTime = new Date(scheduledAt.getTime() + SLOT_DURATION_MS)

  //     const annotated = g.map((p) => ({ ...p, scheduledAt }))

  //     if (now >= gameEndTime) {
  //       const finished: TCurrentGame = {
  //         courtId: court.id,
  //         courtName: court.name,
  //         players: annotated,
  //         startTime: scheduledAt,
  //         estimatedEndTime: gameEndTime,
  //         isPreparing: false,
  //       }
  //       completedGames.push(finished)
  //       if (onGroupDone) onGroupDone(finished)
  //       if (onPlayerDone) annotated.forEach((p) => onPlayerDone(p))
  //     } else if (now >= scheduledAt && now < gameEndTime) {
  //       currentGames.push({
  //         courtId: court.id,
  //         courtName: court.name,
  //         players: annotated,
  //         startTime: scheduledAt,
  //         estimatedEndTime: gameEndTime,
  //         isPreparing: now > gameEndTime && now < slotEndTime,
  //       })
  //     } else {
  //       queue.push({
  //         id: `grp-${court.id}-${scheduledAt.getTime()}`,
  //         courtId: court.id,
  //         courtName: court.name,
  //         players: annotated,
  //         scheduledAt,
  //         estimatedEndTime: gameEndTime,
  //         position: gi + 1,
  //       })
  //     }
  //   }

  //   let nextTransition: Date | null = null
  //   if (currentGames.length > 0) {
  //     nextTransition = currentGames
  //       .map((g) => g.estimatedEndTime)
  //       .sort((a, b) => a.getTime() - b.getTime())[0]
  //   } else if (queue.length > 0) {
  //     nextTransition = queue[0].scheduledAt
  //   }

  //   return this.getScheduleState(
  //     currentGames,
  //     queue,
  //     completedGames,
  //     nextTransition,
  //     waitingPlayers,
  //   )
  // }

public compute(
  options: {
    now?: Date
    onGroupDone?: (game: TCurrentGame) => void
    onPlayerDone?: (player: TQueuePlayer) => void
    completedPlayerIds?: Set<string>
  } = {},
) {
  const { openPlay } = this
  if (!openPlay) throw new Error("No available Open Play Data")

  const now = options.now ?? new Date()
  const completedPlayerIds = options.completedPlayerIds ?? new Set<string>()

  if (!openPlay.startedAt) {
    return this.getScheduleState([], [], [], null, openPlay.queuePlayers)
  }

  const GAME_MS = openPlay.transitionMinutes * 60_000
  const PREPARATION_MS = openPlay.preparationSeconds * 1_000
  const SLOT_DURATION_MS = GAME_MS + PREPARATION_MS

  const allPlayers = openPlay.queuePlayers.filter((p) => !completedPlayerIds.has(p.id))

  // 1. Assign Courts & Distribute Unassigned Players
  const playersByCourt: Record<string, TQueuePlayer[]> = {}
  const unassignedPool: TQueuePlayer[] = []
  openPlay.courts.forEach(c => { playersByCourt[c.id] = [] })

  allPlayers.forEach(p => {
    if (p.courtId && playersByCourt[p.courtId]) {
      playersByCourt[p.courtId].push(p)
    } else {
      unassignedPool.push(p)
    }
  })

  openPlay.courts.forEach(court => {
    while (playersByCourt[court.id].length < 4 && unassignedPool.length > 0) {
      const p = unassignedPool.shift()!
      p.courtId = court.id 
      playersByCourt[court.id].push(p)
    }
  })

  // 2. Track "Next Available Time" per court
  // Initialized to the start of the session
  const courtAvailableAt: Record<string, number> = {}
  openPlay.courts.forEach(c => {
    courtAvailableAt[c.id] = openPlay.startedAt ? new Date(openPlay.startedAt).getTime() : now.getTime()
  })

  const currentGames: TCurrentGame[] = []
  const queue: TQueueGroup[] = []
  const completedGames: TCurrentGame[] = []
  const waitingPlayers: TQueuePlayer[] = [...unassignedPool] 

  // 3. Create potential groups
  const rawGroups: { courtId: string; players: TQueuePlayer[] }[] = []
  Object.entries(playersByCourt).forEach(([courtId, courtPlayers]) => {
    const chunks = this.chunkPlayers(courtPlayers, 4)
    chunks.forEach((chunk) => {
      if (chunk.length === 4) {
        rawGroups.push({ courtId, players: chunk })
      } else {
        waitingPlayers.push(...chunk)
      }
    })
  })

  // 4. Sequence Groups onto Courts
  rawGroups.forEach((group, idx) => {
    const court = openPlay.courts.find((c) => c.id === group.courtId)!
    
    // The game starts either at its pre-scheduled time OR when the court is free
    const startTimeMs = Math.max(courtAvailableAt[court.id], now.getTime() - SLOT_DURATION_MS * 10) // buffer to allow past games to show as completed
    const scheduledAt = new Date(startTimeMs)
    const gameEndTime = new Date(startTimeMs + GAME_MS)
    
    // Update the court's next available slot (End of game + Transition)
    courtAvailableAt[court.id] = startTimeMs + SLOT_DURATION_MS

    const annotated = group.players.map((p) => ({ ...p, scheduledAt }))

    if (now >= gameEndTime) {
      const finished = { courtId: court.id, courtName: court.name, players: annotated, startTime: scheduledAt, estimatedEndTime: gameEndTime, isPreparing: false }
      completedGames.push(finished)
      if (options.onGroupDone) options.onGroupDone(finished)
    } else if (now >= scheduledAt && now < gameEndTime) {
      currentGames.push({ 
        courtId: court.id, 
        courtName: court.name, 
        players: annotated, 
        startTime: scheduledAt, 
        estimatedEndTime: gameEndTime, 
        isPreparing: (now.getTime() > (gameEndTime.getTime() - PREPARATION_MS)) 
      })
    } else {
      queue.push({ 
        id: `grp-${court.id}-${idx}`, 
        courtId: court.id, 
        courtName: court.name, 
        players: annotated, 
        scheduledAt, 
        estimatedEndTime: gameEndTime, 
        position: queue.length + 1 
      })
    }
  })

  // 5. Find the next "Event" (Transition)
  let nextTransition: Date | null = null
  const allEndTimes = [...currentGames, ...queue].map(g => g.estimatedEndTime)
  if (allEndTimes.length > 0) {
    nextTransition = new Date(Math.min(...allEndTimes.map(d => d.getTime())))
  }

  return this.getScheduleState(currentGames, queue, completedGames, nextTransition, waitingPlayers)
}

  private getWaitingGroup(now: Date = new Date()): TQueueGroup | null {
    const { openPlay } = this
    if (!openPlay) throw new Error("No available Open Play Data")

    const players = openPlay.queuePlayers
    const courts = openPlay.courts
    const groups = this.chunkPlayers(players, 4)
    const courtsCount = courts.length

    let waitingGroup: TQueueGroup | null = null

    // Find the latest endedAt among players
    const lastEndedAt = players
      .filter((p) => p.endedAt)
      .map((p) => p.endedAt as Date)
      .sort((a, b) => b.getTime() - a.getTime())[0]

    for (let slot = 0; slot * courtsCount < groups.length; slot++) {
      for (let ci = 0; ci < courtsCount; ci++) {
        const gi = slot * courtsCount + ci
        if (gi >= groups.length) break

        const g = groups[gi]

        // Only consider groups with unscheduled players
        const allUnscheduled = g.every((p) => !p.scheduledAt)

        if (allUnscheduled) {
          waitingGroup = {
            id: `waiting-${courts[ci].id}-${now.getTime()}`,
            courtId: courts[ci].id,
            courtName: courts[ci].name,
            players: g,
            scheduledAt: null as any, // explicitly unscheduled
            estimatedEndTime: null as any, // no end time yet
            position: gi + 1,
          }
          break
        }
      }
      if (waitingGroup) break // stop at the first waiting group (FIFO)
    }

    return waitingGroup
  }

  public async scheduleWaitingPlayers(prismaTransaction?: TPrismaTransaction) {
    const db = prismaTransaction ?? prisma
    await this.initializeData(db)
    const newGroup = this.promoteWaitingGroup()
    if (newGroup)  await this.lineupQueueGroupPlayers(newGroup, db)
  }

  public async lineupQueueGroupPlayers(newGroup: TQueueGroup, db: TPrismaTransaction) {
  console.info({newGroup, players: newGroup?.players})
  if (!newGroup?.players?.length) return;

  const playerIds = newGroup.players.map(p => p.playerId);
  const { scheduledAt, estimatedEndTime, courtId } = newGroup;

  // 1. FETCH ALL metadata at once (1 Query)
  const allPlayerData = await db.openPlayPlayer.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, totalPlayTime: true, startAt: true }
  });

  // 2. BULK UPDATE existing lineup records (1 Query)
  // This updates everyone who already has a record for this OpenPlay
  const result = await db.lineupQueue.updateMany({
    where: {
      openPlayId: this.openPlayId,
      playerId: { in: playerIds },
    },
    data: {
      scheduledAt,
      endedAt: estimatedEndTime,
      courtId,
      status: QueueStatus.waiting,
    },
  });

  console.info({result, openId: this.openPlayId, playerIds})

  // 3. BULK CREATE missing records (1 Query)
  // skipDuplicates: true ensures we don't crash if they were already updated in step 2
  // await db.lineupQueue.createMany({
  //   data: playerIds.map(pid => ({
  //     playerId: pid,
  //     openPlayId: this.openPlayId,
  //     scheduledAt,
  //     endedAt: estimatedEndTime,
  //     courtId,
  //     status: QueueStatus.waiting,
  //   })),
  //   skipDuplicates: true,
  // });

  // 4. BULK UPDATE Player session timings (Variable, but optimized)
  // We only care about players whose session hasn't started (startAt is null)
  const freshPlayers = allPlayerData.filter(p => !p.startAt);
  console.info({freshPlayers})
  if (freshPlayers.length > 0) {
    // Group players by their totalPlayTime so we can update them in batches
    // (e.g., all 180min players in one query, all 60min players in another)
    const playTimeGroups = freshPlayers.reduce((acc, p) => {
      const time = p.totalPlayTime ?? 180;
      if (!acc[time]) acc[time] = [];
      acc[time].push(p.id);
      return acc;
    }, {} as Record<number, string[]>);

    for (const [minutes, ids] of Object.entries(playTimeGroups)) {
      const endAt = new Date(scheduledAt.getTime() + Number(minutes) * 60_000);
      
      await db.openPlayPlayer.updateMany({
        where: { id: { in: ids }, startAt: null },
        data: {
          startAt: scheduledAt,
          endAt: endAt,
        },
      });
    }
  }
}
}
