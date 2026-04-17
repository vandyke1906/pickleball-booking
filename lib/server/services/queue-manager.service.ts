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
   * Compute schedule and optionally trigger callback when a group finishes.
   * @param options Object containing parameters
   *   - now: Current time (default: new Date())
   *   - onGroupDone: Callback invoked when a group is completed
   *   - onPlayerDone: Callback invoked when a queue player is completed
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

    if (!openPlay.startedAt) return { currentGames: [], queue: [], nextTransition: null }

    // Normalize units to milliseconds
    const GAME_MS = openPlay.transitionMinutes * 60_000 // minutes → ms
    const PREPARATION_MS = openPlay.preparationSeconds * 1_000 // seconds → ms
    const SLOT_DURATION_MS = GAME_MS + PREPARATION_MS // total slot duration in ms

    const startTime = new Date(openPlay.startedAt)
    const players = openPlay.queuePlayers.filter((p) => !completedPlayerIds.has(p.id))
    const courts = openPlay.courts

    const groups = this.chunkPlayers(players, 4)
    const courtsCount = courts.length

    const currentGames: TCurrentGame[] = []
    const queue: TQueueGroup[] = []
    const completedGames: TCurrentGame[] = [] // new collection

    // First slot: assign first groups to courts
    for (let i = 0; i < courtsCount; i++) {
      const group = groups[i]
      if (!group) break

      const gameStartTime = startTime
      const gameEndTime = new Date(gameStartTime.getTime() + GAME_MS)
      const slotEndTime = new Date(gameStartTime.getTime() + SLOT_DURATION_MS)
      const isPreparing =
        now.getTime() > gameEndTime.getTime() && now.getTime() < slotEndTime.getTime()

      const game: TCurrentGame = {
        courtId: courts[i].id,
        courtName: courts[i].name,
        players: group,
        startTime: gameStartTime,
        estimatedEndTime: gameEndTime,
        isPreparing,
      }

      if (now >= game.estimatedEndTime) {
        // 🔔 finished → callback + move to completedGames
        completedGames.push(game)
        if (onGroupDone) onGroupDone(game)
        if (onPlayerDone) game.players.forEach((p) => onPlayerDone(p))
      } else {
        currentGames.push(game)
      }
    }

    // Remaining groups go into queue sequentially, grouped by slot
    for (let slot = 1; slot * courtsCount < groups.length; slot++) {
      const scheduledAt = new Date(startTime.getTime() + slot * SLOT_DURATION_MS)

      for (let ci = 0; ci < courtsCount; ci++) {
        const gi = slot * courtsCount + ci
        if (gi >= groups.length) break

        queue.push({
          id: `grp-${slot}-${ci}`,
          courtId: courts[ci].id,
          courtName: courts[ci].name,
          players: groups[gi],
          scheduledAt, // all courts in this slot share the same time
          position: gi - courtsCount + 1,
        })
      }
    }

    // if no current games but there are completed ones, check next queue slot
    if (currentGames.length === 0 && completedGames.length > 0 && queue.length > 0) {
      const nextSlotTime = queue[0].scheduledAt
      const nextSlotEnd = new Date(nextSlotTime.getTime() + SLOT_DURATION_MS)

      if (now.getTime() >= nextSlotTime.getTime() && now.getTime() < nextSlotEnd.getTime()) {
        const promoted: TCurrentGame[] = []

        for (const q of queue) {
          if (q.scheduledAt.getTime() === nextSlotTime.getTime()) {
            promoted.push({
              courtId: q.courtId,
              courtName: q.courtName,
              players: q.players,
              startTime: q.scheduledAt,
              estimatedEndTime: new Date(q.scheduledAt.getTime() + GAME_MS),
              isPreparing:
                now.getTime() > q.scheduledAt.getTime() + GAME_MS &&
                now.getTime() < nextSlotEnd.getTime(),
            })
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

    const nextTransition = new Date(startTime.getTime() + SLOT_DURATION_MS)

    return {
      openPlay,
      currentGames,
      queue,
      completedGames,
      nextTransition,
    }
  }
}
