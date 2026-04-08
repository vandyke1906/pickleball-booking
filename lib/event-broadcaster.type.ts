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
