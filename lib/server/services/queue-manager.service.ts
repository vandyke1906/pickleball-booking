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

  public compute(now: Date = new Date()) {
    const { openPlay } = this

    if (!openPlay.startedAt) {
      return {
        currentGames: [],
        queue: [],
        nextTransition: null,
      }
    }

    const GAME = openPlay.transitionMinutes
    const PREPARATION = openPlay.playerSwitchMinutes
    const SLOT_DURATION = GAME + PREPARATION

    const startTime = new Date(openPlay.startedAt)
    const players = openPlay.queuePlayers
    const courts = openPlay.courts

    const groups = this.chunkPlayers(players, 4)
    const courtsCount = courts.length

    const currentGames: TCurrentGame[] = []
    const queue: TQueueGroup[] = []

    // First slot: assign first groups to courts
    for (let i = 0; i < courtsCount; i++) {
      const group = groups[i]
      if (!group) break

      const gameStartTime = startTime
      const gameEndTime = new Date(gameStartTime.getTime() + GAME * 60000)
      const slotEndTime = new Date(gameStartTime.getTime() + SLOT_DURATION * 60000)
      const isPreparing = now > gameEndTime && now < slotEndTime

      currentGames.push({
        courtId: courts[i].id,
        courtName: courts[i].name,
        players: group,
        startTime: gameStartTime,
        estimatedEndTime: gameEndTime,
        isPreparing,
      })
    }

    // Remaining groups go into queue sequentially
    for (let gi = courtsCount; gi < groups.length; gi++) {
      const scheduledAt = new Date(startTime.getTime() + gi * SLOT_DURATION * 60000)
      queue.push({
        id: `grp-${gi}`,
        players: groups[gi],
        scheduledAt,
        position: gi - courtsCount + 1,
      })
    }

    const nextTransition = new Date(startTime.getTime() + SLOT_DURATION * 60000)

    return {
      currentGames,
      queue,
      nextTransition,
    }
  }
}
