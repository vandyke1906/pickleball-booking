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
  players: Player[] // ← This is the initial pool
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
  const [playingPlayers, setPlayingPlayers] = useState<Set<string>>(new Set()) // Track who is currently playing
  const [currentTime, setCurrentTime] = useState(new Date())

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Available players = initial players minus those currently playing
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

  // Auto-create queue from available players (groups of 4)
  useEffect(() => {
    if (availablePlayers.length < 4 || queue.length > 0) return

    const shuffled = [...availablePlayers].sort(() => Math.random() - 0.5)
    const groups: QueueGroup[] = []

    for (let i = 0; i < shuffled.length; i += 4) {
      const groupPlayers = shuffled.slice(i, i + 4)
      if (groupPlayers.length === 4) {
        groups.push({
          id: `grp-${Date.now()}-${i}`,
          players: groupPlayers,
          scheduledAt: new Date(Date.now() + groups.length * 10 * 60 * 1000),
          position: groups.length + 1,
        })
      }
    }

    setQueue(groups)
  }, [availablePlayers, queue.length])

  // Auto rotation: When game ends → move next group to court + update playing players
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()

      setCurrentGames((prevCurrent) => {
        const finished = prevCurrent.filter((g) => g.estimatedEndTime <= now)
        const stillPlaying = prevCurrent.filter((g) => g.estimatedEndTime > now)

        if (finished.length === 0 || queue.length === 0) return prevCurrent

        let updatedCurrent = [...stillPlaying]
        let updatedQueue = [...queue]
        let newlyPlaying = new Set(playingPlayers)

        finished.forEach((finishedGame) => {
          if (updatedQueue.length > 0) {
            const nextGroup = updatedQueue.shift()!

            const newGame: CurrentGame = {
              courtId: finishedGame.courtId,
              courtName: finishedGame.courtName,
              players: nextGroup.players,
              startTime: now,
              estimatedEndTime: new Date(now.getTime() + 20 * 60 * 1000),
            }

            updatedCurrent.push(newGame)

            // Add these players to playing set
            nextGroup.players.forEach((p) => newlyPlaying.add(p.id))
          }
        })

        setQueue(updatedQueue)
        setPlayingPlayers(newlyPlaying)

        return updatedCurrent
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [queue, playingPlayers])

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
      if (selectedPlayers.length !== 4) {
        alert("Group must have exactly 4 players.")
        return
      }
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
          estimatedEndTime: new Date(Date.now() + 20 * 60 * 1000),
        }

        const updated = [...prev]
        updated[courtIndex] = newGame

        // Update playing players
        const newPlaying = new Set(playingPlayers)
        nextGroup.players.forEach((p) => newPlaying.add(p.id))

        setQueue((q) => q.slice(1))
        setPlayingPlayers(newPlaying)

        return updated
      })
    },
    [queue, playingPlayers],
  )

  return {
    currentGames,
    queue,
    availablePlayers, // ← Use this instead of openPlay.players for UI
    getCountdown,
    addGroupToQueue,
    removeFromQueue,
    moveNextGroupToCourt,
    freeCourts: currentGames.filter((g) => g.estimatedEndTime <= currentTime),
    nextGroup: queue[0] || null,
  }
}
