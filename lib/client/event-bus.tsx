import { useEffect, useRef } from "react"

export const EventBusKeys = {
  OPENPLAY_PLAYER_ADD: "openplay:player-add",
}

type EventMap = {
  [EventBusKeys.OPENPLAY_PLAYER_ADD]: { openPlayId: string; data?: any }
}

type EventHandler<T = any> = (data: T) => void

const listeners = new Map<keyof EventMap, Set<EventHandler>>()

export const eventBus = {
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
    const handlers = listeners.get(event)
    if (!handlers) return
    handlers.forEach((handler) => handler(data))
  },

  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>) {
    if (!listeners.has(event)) listeners.set(event, new Set())
    listeners.get(event)!.add(handler)
    return () => listeners.get(event)!.delete(handler)
  },

  off<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>) {
    listeners.get(event)?.delete(handler)
  },
}

export function useEventListener<K extends keyof EventMap>(
  event: K,
  handler: EventHandler<EventMap[K]>,
) {
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    const unsubscribe = eventBus.on(event, handler)

    return () => {
      unsubscribe()
    }
  }, [event, handler])
}
