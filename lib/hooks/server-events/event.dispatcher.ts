import { TEventHandler } from "@/lib/event-broadcaster.type"

const listeners = new Map<string, Set<TEventHandler>>()

export function dispatchEvent(type: string, data: any) {
  const handlers = listeners.get(type)
  if (handlers) {
    handlers.forEach((cb) => cb(data))
  }
}

export function onEvent<T>(type: string, callback: TEventHandler<T>) {
  if (!listeners.has(type)) listeners.set(type, new Set())
  listeners.get(type)!.add(callback as TEventHandler)

  return () => {
    listeners.get(type)?.delete(callback as TEventHandler)
    if (listeners.get(type)?.size === 0) listeners.delete(type)
  }
}
