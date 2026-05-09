import { OpenPlay, PlayerSkill } from "@/.config/prisma/generated/prisma"

export type TQueuePlayer = {
  id: string
  openPlayId: string
  status: string
  openPlayGroupId: string
  playerId: string
  courtName?: string
  skill: PlayerSkill
  playerName: string
  scheduledAt?: Date | null
  endedAt?: Date | null
}

export type TQueueCourt = { id: string; name: string }
export type TQueueOpenPlay = OpenPlay & {
  queuePlayers: TQueuePlayer[]
  courts: TQueueCourt[]
}

export type TQueueGroup = {
  id: string
  courtId: string
  courtName: string
  players: TQueuePlayer[]
  scheduledAt: Date
  estimatedEndTime: Date
  position: number
}

export type TCurrentGame = {
  courtId: string
  courtName: string
  players: TQueuePlayer[]
  startTime: Date
  estimatedEndTime: Date
  isPreparing: boolean
}
