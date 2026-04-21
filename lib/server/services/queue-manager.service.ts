import { QueueStatus } from "@/.config/prisma/generated/prisma"
import { prisma } from "@/lib/prisma"
import {
  TQueuePlayer,
  TCurrentGame,
  TQueueGroup,
  TQueueOpenPlay,
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

    const waitingGroup = this.getWaitingGroup()
    if (!waitingGroup) return null

    // Get the last scheduled player (FIFO) from queuePlayers
    const lastScheduledPlayer = openPlay.queuePlayers
      .filter((p) => p.scheduledAt)
      .sort((a, b) => b.scheduledAt!.getTime() - a.scheduledAt!.getTime())[0]

    // Determine baseline from last scheduled player’s endedAt or now
    const baseline = lastScheduledPlayer?.endedAt ?? now

    // Start time is baseline + slot duration
    const scheduledAt = new Date(baseline.getTime() + (PREPARATION_MS * 2))
    const gameEndTime = new Date(scheduledAt.getTime() + GAME_MS)

    const newGroup: TQueueGroup = {
      id: `grp-${openPlay.courts[0].id}-${scheduledAt.getTime()}`,
      courtId: openPlay.courts[0].id,
      courtName: openPlay.courts[0].name,
      players: waitingGroup.players.map((p) => ({ ...p, scheduledAt })),
      scheduledAt,
      estimatedEndTime: gameEndTime,
      position: lastScheduledPlayer ? waitingGroup.position : 1,
    }

    return newGroup
  }

  /** Compute current state with callbacks */
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
    const onGroupDone = options.onGroupDone
    const onPlayerDone = options.onPlayerDone
    const completedPlayerIds = options.completedPlayerIds ?? new Set<string>()

    if (!openPlay.startedAt) {
      return this.getScheduleState([], [], [], null, openPlay.queuePlayers)
    }

    const GAME_MS = openPlay.transitionMinutes * 60_000
    const PREPARATION_MS = openPlay.preparationSeconds * 1_000
    const SLOT_DURATION_MS = GAME_MS + PREPARATION_MS

    // Remove completed players entirely
    const players = openPlay.queuePlayers.filter((p) => !completedPlayerIds.has(p.id))
    const courts = openPlay.courts
    const groups = this.chunkPlayers(players, 4) // FIFO chunking
    const courtsCount = courts.length

    const currentGames: TCurrentGame[] = []
    const queue: TQueueGroup[] = []
    const completedGames: TCurrentGame[] = []
    let waitingPlayers: TQueuePlayer[] = []

    for (let slot = 0; slot * courtsCount < groups.length; slot++) {
      for (let ci = 0; ci < courtsCount; ci++) {
        const gi = slot * courtsCount + ci
        if (gi >= groups.length) break

        const g = groups[gi]
        if (g.length < 4) {
          waitingPlayers = g
          break
        }

        // Determine scheduledAt: use players’ scheduledAt if available, else fallback
        const scheduledAt =
          g[0].scheduledAt ?? (openPlay.startedAt ? new Date(openPlay.startedAt) : now)

        const gameEndTime = new Date(scheduledAt.getTime() + GAME_MS)
        const slotEndTime = new Date(scheduledAt.getTime() + SLOT_DURATION_MS)

        const annotated = g.map((p) => ({ ...p, scheduledAt }))

        if (now >= gameEndTime) {
          const finished: TCurrentGame = {
            courtId: courts[ci].id,
            courtName: courts[ci].name,
            players: annotated,
            startTime: scheduledAt,
            estimatedEndTime: gameEndTime,
            isPreparing: false,
          }
          completedGames.push(finished)
          if (onGroupDone) onGroupDone(finished)
          if (onPlayerDone) annotated.forEach((p) => onPlayerDone(p))
        } else if (now >= scheduledAt && now < gameEndTime) {
          currentGames.push({
            courtId: courts[ci].id,
            courtName: courts[ci].name,
            players: annotated,
            startTime: scheduledAt,
            estimatedEndTime: gameEndTime,
            isPreparing: now > gameEndTime && now < slotEndTime,
          })
        } else {
          queue.push({
            id: `grp-${courts[ci].id}-${scheduledAt.getTime()}`,
            courtId: courts[ci].id,
            courtName: courts[ci].name,
            players: annotated,
            scheduledAt,
            estimatedEndTime: gameEndTime,
            position: gi + 1,
          })
        }
      }
    }

    let nextTransition: Date | null = null
    if (currentGames.length > 0) {
      nextTransition = currentGames
        .map((g) => g.estimatedEndTime)
        .sort((a, b) => a.getTime() - b.getTime())[0]
    } else if (queue.length > 0) {
      nextTransition = queue[0].scheduledAt
    }

    return this.getScheduleState(
      currentGames,
      queue,
      completedGames,
      nextTransition,
      waitingPlayers,
    )
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

    // Baseline time: last endedAt if exists, otherwise now
    let baseline = lastEndedAt ?? now

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
    // const group = this.addPlayerToQueue(queuePlayer)
    const newGroup = this.promoteWaitingGroup()
    console.info({ newGroup: JSON.stringify(newGroup, null, 2) })
    if (newGroup)  await this.lineupQueueGroupPlayers(newGroup, db)
  }

  public async lineupQueueGroupPlayers(newGroup: TQueueGroup, db: TPrismaTransaction) {
    for (const player of newGroup?.players) {
      await db.lineupQueue.upsert({
        where: {
          playerId_openPlayId: {
            playerId: player.playerId,
            openPlayId: this.openPlayId,
          },
        },
        update: {
          scheduledAt: newGroup.scheduledAt,
          endedAt: newGroup.estimatedEndTime,
          courtId: newGroup.courtId,
          status: QueueStatus.waiting,
        },
        create: {
          playerId: player.id,
          openPlayId: this.openPlayId,
          scheduledAt: newGroup.scheduledAt,
          endedAt: newGroup.estimatedEndTime,
          courtId: newGroup.courtId,
          status: QueueStatus.waiting,
        },
      })
    }
  }
}
