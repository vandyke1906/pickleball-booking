"use client"

import { motion, type SpringOptions, useMotionValue, useSpring } from "framer-motion"
import { useCallback, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export interface BubbleBackgroundProps {
  className?: string
  children?: React.ReactNode
  interactive?: boolean
  transition?: SpringOptions
  colors?: {
    first: string
    second: string
    third: string
    fourth: string
    fifth: string
    sixth: string
  }
}

export function BubbleBackground({
  className,
  children,
  interactive = false,
  transition = { stiffness: 100, damping: 20 },
  colors = {
    first: "186, 230, 201",
    second: "167, 243, 208",
    third: "187, 247, 208",
    fourth: "220, 252, 231",
    fifth: "204, 251, 241",
    sixth: "240, 253, 244",
  },
}: BubbleBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, transition)
  const springY = useSpring(mouseY, transition)

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      mouseX.set(e.clientX - centerX)
      mouseY.set(e.clientY - centerY)
    },
    [mouseX, mouseY],
  )

  useEffect(() => {
    if (!interactive) return
    const container = containerRef.current
    if (!container) return

    container.addEventListener("mousemove", handleMouseMove)
    return () => container.removeEventListener("mousemove", handleMouseMove)
  }, [interactive, handleMouseMove])

  // Create gradient style functions to avoid CSS variables on :root
  const makeGradient = (color: string) =>
    `radial-gradient(circle at center, rgba(${color}, 0.8) 0%, rgba(${color}, 0) 50%)`

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 overflow-hidden bg-gradient-to-br from-violet-950 to-blue-950",
        className,
      )}
    >
      {/* SVG goo filter */}
      <svg className="hidden" aria-hidden="true">
        <defs>
          <filter id="bubble-goo">
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="10" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              result="goo"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      {/* Bubbles container with goo filter */}
      <div className="absolute inset-0" style={{ filter: "url(#bubble-goo) blur(40px)" }}>
        {/* Bubble 1 - vertical float */}
        <motion.div
          className="absolute rounded-full mix-blend-hard-light"
          style={{
            width: "80%",
            height: "80%",
            top: "10%",
            left: "10%",
            background: makeGradient(colors.first),
          }}
          animate={{ y: [-50, 50, -50] }}
          transition={{ duration: 30, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
        />

        {/* Bubble 2 - rotating orbit */}
        <motion.div
          className="absolute inset-0 flex justify-center items-center"
          style={{ transformOrigin: "calc(50% - 400px) center" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 20, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
        >
          <div
            className="rounded-full mix-blend-hard-light"
            style={{
              width: "80%",
              height: "80%",
              background: makeGradient(colors.second),
            }}
          />
        </motion.div>

        {/* Bubble 3 - rotating orbit offset */}
        <motion.div
          className="absolute inset-0 flex justify-center items-center"
          style={{ transformOrigin: "calc(50% + 400px) center" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 40, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
        >
          <div
            className="absolute rounded-full mix-blend-hard-light"
            style={{
              width: "80%",
              height: "80%",
              top: "calc(50% + 200px)",
              left: "calc(50% - 500px)",
              background: makeGradient(colors.third),
            }}
          />
        </motion.div>

        {/* Bubble 4 - horizontal float */}
        <motion.div
          className="absolute rounded-full mix-blend-hard-light opacity-70"
          style={{
            width: "80%",
            height: "80%",
            top: "10%",
            left: "10%",
            background: makeGradient(colors.fourth),
          }}
          animate={{ x: [-50, 50, -50] }}
          transition={{ duration: 40, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
        />

        {/* Bubble 5 - large rotating orbit */}
        <motion.div
          className="absolute inset-0 flex justify-center items-center"
          style={{ transformOrigin: "calc(50% - 800px) calc(50% + 200px)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 20, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
        >
          <div
            className="absolute rounded-full mix-blend-hard-light"
            style={{
              width: "160%",
              height: "160%",
              top: "calc(50% - 80%)",
              left: "calc(50% - 80%)",
              background: makeGradient(colors.fifth),
            }}
          />
        </motion.div>

        {/* Interactive bubble - follows mouse */}
        {interactive && (
          <motion.div
            className="absolute rounded-full mix-blend-hard-light opacity-70"
            style={{
              width: "100%",
              height: "100%",
              background: makeGradient(colors.sixth),
              x: springX,
              y: springY,
            }}
          />
        )}
      </div>

      {/* Content layer */}
      {children && <div className="relative z-10 h-full w-full">{children}</div>}
    </div>
  )
}
