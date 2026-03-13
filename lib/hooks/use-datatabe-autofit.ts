import { useRef, useEffect, useState } from "react"

export function useAutofitColumn(): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (ref.current) {
      const measuredWidth = ref.current.scrollWidth
      setWidth(measuredWidth + 16)
    }
  }, [ref.current])

  return [ref, width]
}
