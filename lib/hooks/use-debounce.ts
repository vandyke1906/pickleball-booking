"use client"

import {useState, useEffect, useRef} from "react"

export function useDebounce<T>(value: T, delay: number, options?: {immediate?: boolean}): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(options?.immediate ? value : (null as unknown as T))
  const handlerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (handlerRef.current) clearTimeout(handlerRef.current)

    if (options?.immediate) {
      setDebouncedValue(value)
    } else {
      handlerRef.current = setTimeout(() => {
        setDebouncedValue(value)
        handlerRef.current = null
      }, delay)
    }

    return () => {
      if (handlerRef.current) clearTimeout(handlerRef.current)
    }
  }, [value, delay, options?.immediate])

  return debouncedValue
}
