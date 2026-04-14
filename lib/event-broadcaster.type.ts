export const BroadcastEventTypes = {
  CONNNECTION: "connection",
  USER_UPDATED: "user:updated",
  USER_CREATED: "user:created",
  USER_DELETED: "user:deleted",
  NOTIFICATION: "notification",
  CHAT_MESSAGE: "chat:message",
  SYSTEM_MAINTENANCE: "system:maintenance",
  BOOKING_CREATED: "booking:created",
  BOOKING_CANCELLED: "booking:cancelled",
  OPENPLAY_UPDATED: "openplay:updated",
  OPENPLAY_NEW_PLAYER: "openplay:new_player",
  OPENPLAY_UPDATE_PLAYER: "openplay:update_player",
  OPENPLAY_REMOVE_PLAYER: "openplay:remove_player",
  OPENPLAY_START: "openplay:start",
  OPENPLAY_PAUSE: "openplay:pause",
  OPENPLAY_NEXT: "openplay:next",
} as const

export type TEventType = (typeof BroadcastEventTypes)[keyof typeof BroadcastEventTypes]

export type TBroadcastEvent<T = unknown> = {
  type: TEventType
  data: T
  id?: string
  timestamp?: string
}

export type TSubscriber = (event: TBroadcastEvent) => void
export type TEventHandler<T = any> = (data: T) => void
