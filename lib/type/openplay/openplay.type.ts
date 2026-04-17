import { OpenPlay } from "@/.config/prisma/generated/prisma"

export type TQueuePlayer = { id: string; playerId: string; playerName: string }
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
