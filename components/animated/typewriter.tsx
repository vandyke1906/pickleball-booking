"use client"
import { useEffect } from "react"
import { motion, useMotionValue, useTransform, animate } from "framer-motion"

export default function TextGenerateEffect({
  children,
  className = "",
}: {
  children: string // expecting text children
  className?: string
}) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest))
  const displayText = useTransform(rounded, (latest) => children.slice(0, latest))

  useEffect(() => {
    const controls = animate(count, children.length, {
      type: "tween",
      duration: 3.5,
      ease: "easeInOut",
    })
    return controls.stop
  }, [children])

  return <motion.span className={className}>{displayText}</motion.span>
}
