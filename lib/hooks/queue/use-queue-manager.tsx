// hooks/useOpenPlayQueueManager.ts
import { useState, useEffect, useCallback, useMemo } from "react"

export type Player = { id: string; playerName: string }
export type Court = { id: string; name: string }

export type OpenPlayData = {
  id: string
  startTime: string
  endTime: string
  transitionMinutes: number
  status: string
  courts: Court[]
  players: Player[]
}

export type QueueGroup = {
  id: string
  players: Player[]
  scheduledAt: Date
  courtId?: string
  courtName?: string
  position: number
}

export type CurrentGame = {
  courtId: string
  courtName: string
  players: Player[]
  startTime: Date
  estimatedEndTime: Date
}

export function useQueueManager(openPlay: OpenPlayData) {
  const [currentGames, setCurrentGames] = useState<CurrentGame[]>([])
  const [queue, setQueue] = useState<QueueGroup[]>([])
  const [playingPlayers, setPlayingPlayers] = useState<Set<string>>(new Set())
  const [currentTime, setCurrentTime] = useState(new Date())

  const GAME_DURATION_MINUTES = 20
  const TRANSITION_MS = openPlay.transitionMinutes * 60 * 1000

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const availablePlayers = useMemo(() => {
    return openPlay.players.filter((p) => !playingPlayers.has(p.id))
  }, [openPlay.players, playingPlayers])

  // Initialize courts
  useEffect(() => {
    const initialGames: CurrentGame[] = openPlay.courts.map((court) => ({
      courtId: court.id,
      courtName: court.name,
      players: [],
      startTime: new Date(),
      estimatedEndTime: new Date(Date.now() - 100000),
    }))
    setCurrentGames(initialGames)
  }, [openPlay.courts])

  // ==================== SMART QUEUE BUILDER (New + Removed Players) ====================
  const buildQueueFromPlayers = useCallback((players: Player[]): QueueGroup[] => {
    if (players.length === 0) return []

    const groups: QueueGroup[] = []
    const playersCopy = [...players] // preserve original order from openPlay.players

    for (let i = 0; i < playersCopy.length; i += 4) {
      const groupPlayers = playersCopy.slice(i, i + 4)
      if (groupPlayers.length > 0) {
        groups.push({
          id: `grp-${Date.now()}-${i}`,
          players: groupPlayers,
          scheduledAt: new Date(Date.now() + groups.length * 10 * 60 * 1000),
          position: groups.length + 1,
        })
      }
    }
    return groups
  }, [])

  // Auto-build or rebuild queue when availablePlayers change
  // This handles BOTH: New players joining AND players being removed
  useEffect(() => {
    if (availablePlayers.length === 0) {
      setQueue([])
      return
    }

    // If queue is empty → build fresh queue (normal case)
    if (queue.length === 0) {
      const newQueue = buildQueueFromPlayers(availablePlayers)
      setQueue(newQueue)
      return
    }

    // If queue already exists → check if we need to rebuild (player removed or order changed)
    // We rebuild only if the number of available players doesn't match expected remaining
    const totalPlayersInQueue = queue.reduce((sum, g) => sum + g.players.length, 0)

    if (totalPlayersInQueue !== availablePlayers.length) {
      // Player was removed (or added while games are running) → rebuild cleanly
      const newQueue = buildQueueFromPlayers(availablePlayers)
      setQueue(newQueue)
    }
    // Else: no change needed (players still match)
  }, [availablePlayers, queue.length, buildQueueFromPlayers])

  // ==================== REFINED AUTO-ROTATION ====================
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()

      setCurrentGames((prevCurrent) => {
        if (queue.length === 0) return prevCurrent

        const finishedGames = prevCurrent.filter((g) => g.estimatedEndTime <= now)
        if (finishedGames.length === 0) return prevCurrent

        let updatedCurrent = prevCurrent.filter((g) => g.estimatedEndTime > now)
        let updatedQueue = [...queue]
        let newlyPlaying = new Set(playingPlayers)

        finishedGames.forEach((finishedGame) => {
          if (updatedQueue.length > 0) {
            const nextGroup = updatedQueue.shift()!

            const newGame: CurrentGame = {
              courtId: finishedGame.courtId,
              courtName: finishedGame.courtName,
              players: nextGroup.players,
              startTime: now,
              estimatedEndTime: new Date(
                now.getTime() + GAME_DURATION_MINUTES * 60 * 1000 + TRANSITION_MS,
              ),
            }

            updatedCurrent.push(newGame)
            nextGroup.players.forEach((p) => newlyPlaying.add(p.id))
          }
        })

        setQueue(updatedQueue)
        setPlayingPlayers(newlyPlaying)

        return updatedCurrent
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [queue, playingPlayers, TRANSITION_MS])

  const getCountdown = useCallback(
    (target: Date): string => {
      const diff = target.getTime() - currentTime.getTime()
      if (diff <= 0) return "NOW"
      const min = Math.floor(diff / 60000)
      const sec = Math.floor((diff % 60000) / 1000)
      return `${min}:${sec.toString().padStart(2, "0")}`
    },
    [currentTime],
  )

  // Manual controls
  const addGroupToQueue = useCallback(
    (selectedPlayers: Player[]) => {
      if (selectedPlayers.length === 0) return

      const newGroup: QueueGroup = {
        id: `grp-${Date.now()}`,
        players: [...selectedPlayers],
        scheduledAt: new Date(Date.now() + (queue.length + 1) * 8 * 60 * 1000),
        position: queue.length + 1,
      }

      setQueue((prev) => [...prev, newGroup])
    },
    [queue.length],
  )

  const removeFromQueue = useCallback((groupId: string) => {
    setQueue((prev) => prev.filter((g) => g.id !== groupId))
  }, [])

  const moveNextGroupToCourt = useCallback(
    (targetCourtId?: string) => {
      if (queue.length === 0) return
      const nextGroup = queue[0]

      setCurrentGames((prev) => {
        let courtToUse = targetCourtId
        if (!courtToUse) {
          const freeIndex = prev.findIndex((g) => g.estimatedEndTime <= new Date())
          if (freeIndex !== -1) courtToUse = prev[freeIndex].courtId
        }
        if (!courtToUse) return prev

        const courtIndex = prev.findIndex((c) => c.courtId === courtToUse)
        if (courtIndex === -1) return prev

        const newGame: CurrentGame = {
          courtId: prev[courtIndex].courtId,
          courtName: prev[courtIndex].courtName,
          players: nextGroup.players,
          startTime: new Date(),
          estimatedEndTime: new Date(
            Date.now() + GAME_DURATION_MINUTES * 60 * 1000 + TRANSITION_MS,
          ),
        }

        const updated = [...prev]
        updated[courtIndex] = newGame

        const newPlaying = new Set(playingPlayers)
        nextGroup.players.forEach((p) => newPlaying.add(p.id))

        setQueue((q) => q.slice(1))
        setPlayingPlayers(newPlaying)

        return updated
      })
    },
    [queue, playingPlayers, TRANSITION_MS],
  )

  const clearQueue = useCallback(() => setQueue([]), [])
  const rebuildQueue = useCallback(() => setQueue([]), [])

  return {
    currentGames,
    queue,
    availablePlayers,
    getCountdown,
    addGroupToQueue,
    removeFromQueue,
    moveNextGroupToCourt,
    freeCourts: currentGames.filter((g) => g.estimatedEndTime <= currentTime),
    nextGroup: queue[0] || null,
    gameDurationMinutes: GAME_DURATION_MINUTES,
    transitionMinutes: openPlay.transitionMinutes,
    clearQueue,
    rebuildQueue,
  }
}
