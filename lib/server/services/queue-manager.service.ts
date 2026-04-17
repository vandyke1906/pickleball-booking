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

    const startTime = new Date(openPlay.startTime)
    const minutesSinceStart = (now.getTime() - startTime.getTime()) / 60000
    const currentSlot = Math.max(0, Math.floor(minutesSinceStart / SLOT_DURATION))

    const players = openPlay.queuePlayers
    const courts = openPlay.courts

    const groups = this.chunkPlayers(players, 4)
    const courtsCount = courts.length

    const currentGames: TCurrentGame[] = []
    const scheduledPlayers = new Set<string>()

    // Assign groups to courts
    for (let i = 0; i < courtsCount; i++) {
      let group: TQueuePlayer[] | undefined

      // find the next unscheduled group
      for (let gi = currentSlot * courtsCount + i; gi < groups.length; gi++) {
        const candidate = groups[gi]
        if (candidate.every((p) => !scheduledPlayers.has(p.id))) {
          group = candidate
          break
        }
      }

      if (!group) continue // no available group left

      const slotStartMinutes = currentSlot * SLOT_DURATION
      const gameStartTime = new Date(startTime.getTime() + slotStartMinutes * 60000)
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

      // mark players as scheduled
      group.forEach((p) => scheduledPlayers.add(p.id))
    }

    // Build queue with remaining unscheduled groups
    const queue: TQueueGroup[] = groups
      .filter((group) => group.every((p) => !scheduledPlayers.has(p.id)))
      .map((groupPlayers, idx) => {
        const scheduledAt = new Date(
          startTime.getTime() + (currentSlot + 1 + idx) * SLOT_DURATION * 60000,
        )
        groupPlayers.forEach((p) => scheduledPlayers.add(p.id))
        return {
          id: `grp-${currentSlot + 1 + idx}`,
          players: groupPlayers,
          scheduledAt,
          position: idx + 1,
        }
      })

    const nextTransition = new Date(startTime.getTime() + (currentSlot + 1) * SLOT_DURATION * 60000)

    return {
      currentGames,
      queue,
      nextTransition,
    }
  }
}
