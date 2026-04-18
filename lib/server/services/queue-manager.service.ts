import {
  TQueuePlayer,
  TCurrentGame,
  TQueueGroup,
  TQueueOpenPlay,
} from "@/lib/type/openplay/openplay.type"

export class QueueManager {
  constructor(private openPlay: TQueueOpenPlay) {}

  private chunkPlayers(players: TQueuePlayer[], size: number = 4): TQueuePlayer[][] {
    const result: TQueuePlayer[][] = []
    for (let i = 0; i < players.length; i += size) {
      result.push(players.slice(i, i + size))
    }
    return result
  }

  /**
   * Compute schedule and optionally trigger callbacks when groups finish or start.
   * @param options Object containing parameters
   *   - now: Current time (default: new Date())
   *   - onGroupDone: Callback invoked when a group is completed or promoted
   *   - onPlayerDone: Callback invoked when a queue player is completed or promoted
   *   - completedPlayerIds: list of completed players
   */
  public compute(
    options: {
      now?: Date
      onGroupDone?: (game: TCurrentGame) => void
      onPlayerDone?: (player: TQueuePlayer) => void
      completedPlayerIds?: Set<string>
    } = {},
  ) {
    const { openPlay } = this
    const now = options.now ?? new Date()
    const onGroupDone = options.onGroupDone
    const onPlayerDone = options.onPlayerDone
    const completedPlayerIds = options.completedPlayerIds ?? new Set<string>()

    if (!openPlay.startedAt) {
      return {
        isStarted: !!openPlay.startedAt,
        currentGames: [],
        queue: [],
        completedGames: [],
        nextTransition: null,
        waitingPlayers: openPlay.queuePlayers.filter((p) => !completedPlayerIds.has(p.id)),
      }
    }

    // Normalize units to milliseconds
    const GAME_MS = openPlay.transitionMinutes * 60_000 // minutes → ms
    const PREPARATION_MS = openPlay.preparationSeconds * 1_000 // seconds → ms
    const SLOT_DURATION_MS = GAME_MS + PREPARATION_MS

    const startTime = new Date(openPlay.startedAt)
    const players = openPlay.queuePlayers.filter((p) => !completedPlayerIds.has(p.id))
    const courts = openPlay.courts

    const groups = this.chunkPlayers(players, 4)
    const courtsCount = courts.length

    const currentGames: TCurrentGame[] = []
    const queue: TQueueGroup[] = []
    const completedGames: TCurrentGame[] = []

    // Helper to classify a group into completed/current/queue
    const annotatePlayers = (players: TQueuePlayer[], fallbackScheduledAt: Date): TQueuePlayer[] =>
      players.map((p) => ({ ...p, scheduledAt: p.scheduledAt ?? fallbackScheduledAt }))

    const classifyGroup = (
      courtId: string,
      courtName: string,
      players: TQueuePlayer[],
      scheduledAt: Date,
      gameEndTime: Date,
      slotEndTime: Date,
      position?: number,
    ) => {
      const annotated = annotatePlayers(players, scheduledAt)

      if (now >= gameEndTime) {
        // finished
        const finished: TCurrentGame = {
          courtId,
          courtName,
          players: annotated,
          startTime: scheduledAt,
          estimatedEndTime: gameEndTime,
          isPreparing: false,
        }
        completedGames.push(finished)
        if (onGroupDone) onGroupDone(finished)
        if (onPlayerDone) annotated.forEach((p) => onPlayerDone(p))
      } else if (now >= scheduledAt && now < gameEndTime) {
        // currently playing
        currentGames.push({
          courtId,
          courtName,
          players: annotated,
          startTime: scheduledAt,
          estimatedEndTime: gameEndTime,
          isPreparing: now > gameEndTime && now < slotEndTime,
        })
      } else {
        // future slot → queue
        queue.push({
          id: `grp-${courtId}-${scheduledAt.getTime()}`,
          courtId,
          courtName,
          players: annotated,
          scheduledAt,
          estimatedEndTime: gameEndTime,
          position: position ?? 0,
        })
      }
    }

    // First slot
    for (let i = 0; i < courtsCount; i++) {
      const group = groups[i]
      if (!group) break

      const gameStartTime = startTime
      const gameEndTime = new Date(gameStartTime.getTime() + GAME_MS)
      const slotEndTime = new Date(gameStartTime.getTime() + SLOT_DURATION_MS)

      classifyGroup(
        courts[i].id,
        courts[i].name,
        group,
        gameStartTime,
        gameEndTime,
        slotEndTime,
        i + 1,
      )
    }

    // Remaining slots
    for (let slot = 1; slot * courtsCount < groups.length; slot++) {
      const scheduledAt = new Date(startTime.getTime() + slot * SLOT_DURATION_MS)
      const gameEndTime = new Date(scheduledAt.getTime() + GAME_MS)
      const slotEndTime = new Date(scheduledAt.getTime() + SLOT_DURATION_MS)

      for (let ci = 0; ci < courtsCount; ci++) {
        const gi = slot * courtsCount + ci
        if (gi >= groups.length) break

        classifyGroup(
          courts[ci].id,
          courts[ci].name,
          groups[gi],
          scheduledAt,
          gameEndTime,
          slotEndTime,
          gi - courtsCount + 1,
        )
      }
    }

    if (currentGames.length === 0 && completedGames.length > 0 && queue.length > 0) {
      const nextSlotTime = queue[0].scheduledAt
      const nextSlotEnd = new Date(nextSlotTime.getTime() + SLOT_DURATION_MS)

      if (now >= nextSlotTime && now < nextSlotEnd) {
        const promoted: TCurrentGame[] = []

        for (const q of queue) {
          if (q.scheduledAt.getTime() === nextSlotTime.getTime()) {
            const game: TCurrentGame = {
              courtId: q.courtId,
              courtName: q.courtName,
              players: annotatePlayers(q.players, q.scheduledAt),
              startTime: q.scheduledAt,
              estimatedEndTime: new Date(q.scheduledAt.getTime() + GAME_MS),
              isPreparing:
                now.getTime() > new Date(q.scheduledAt.getTime() + GAME_MS).getTime() &&
                now.getTime() < nextSlotEnd.getTime(),
            }

            promoted.push(game)

            // Trigger start callbacks (not done)
            // if (options.onGroupStart) options.onGroupStart(game)
            // if (options.onPlayerStart) game.players.forEach((p) => options.onPlayerStart!(p))
          }
        }

        currentGames.push(...promoted)

        // remove promoted groups from queue
        for (const p of promoted) {
          const idx = queue.findIndex(
            (q) => q.courtId === p.courtId && q.scheduledAt.getTime() === nextSlotTime.getTime(),
          )
          if (idx !== -1) queue.splice(idx, 1)
        }
      }
    }

    let nextTransition: Date | null = null

    if (currentGames.length > 0) {
      // earliest finishing current game
      nextTransition = currentGames
        .map((g) => g.estimatedEndTime)
        .sort((a, b) => a.getTime() - b.getTime())[0]
    } else if (queue.length > 0) {
      nextTransition = queue[0].scheduledAt // first queued group
    }

    return {
      isStarted: !!openPlay.startedAt,
      openPlay,
      currentGames,
      queue,
      completedGames,
      nextTransition,
    }
  }

  public initialize() {
    const { openPlay } = this
    if (!openPlay.startedAt) return []

    const GAME_MS = openPlay.transitionMinutes * 60_000
    const PREPARATION_MS = openPlay.preparationSeconds * 1_000
    const SLOT_DURATION_MS = GAME_MS + PREPARATION_MS

    const startTime = new Date(openPlay.startedAt)
    const players = openPlay.queuePlayers
    const courts = openPlay.courts
    const groups = this.chunkPlayers(players, 4)
    const courtsCount = courts.length

    const scheduledGroups: TQueueGroup[] = []

    for (let slot = 0; slot * courtsCount < groups.length; slot++) {
      const scheduledAt = new Date(startTime.getTime() + slot * SLOT_DURATION_MS)
      const gameEndTime = new Date(scheduledAt.getTime() + GAME_MS)

      for (let ci = 0; ci < courtsCount; ci++) {
        const gi = slot * courtsCount + ci
        if (gi >= groups.length) break

        scheduledGroups.push({
          id: `grp-${courts[ci].id}-${scheduledAt.getTime()}`,
          courtId: courts[ci].id,
          courtName: courts[ci].name,
          players: groups[gi].map((p) => ({ ...p, scheduledAt })),
          scheduledAt,
          estimatedEndTime: gameEndTime,
          position: gi + 1,
        })
      }
    }

    return scheduledGroups
  }
}
