"use client"

import { useEffect, useRef, useState, useMemo, ReactNode } from "react"
import { motion, useInView } from "framer-motion"

interface ShinyTextProps {
  children: ReactNode
  className?: string
  shineColor?: string
  duration?: number
  angle?: number
  shimmerWidth?: number
  trigger?: "hover" | "loop" | "inView"
  disabled?: boolean
}

export const ShinyText = ({
  children,
  className = "",
  shineColor = "rgba(255, 255, 255, 1)",
  duration = 3,
  angle = 120,
  shimmerWidth = 200,
  trigger = "loop",
  disabled = false,
}: Readonly<ShinyTextProps>) => {
  const containerRef = useRef<HTMLSpanElement>(null)
  const isInView = useInView(containerRef, { once: false, amount: 0.5 })
  const [isHovering, setIsHovering] = useState(false)
  const [shouldAnimate, setShouldAnimate] = useState(false)

  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

  useEffect(() => {
    if (disabled || prefersReducedMotion) {
      setShouldAnimate(false)
      return
    }

    switch (trigger) {
      case "loop":
        setShouldAnimate(true)
        break
      case "inView":
        setShouldAnimate(isInView)
        break
      case "hover":
        setShouldAnimate(isHovering)
        break
    }
  }, [trigger, isInView, isHovering, disabled, prefersReducedMotion])

  const shimmerGradient = useMemo(
    () => `linear-gradient(
      ${angle}deg,
      transparent 0%,
      transparent ${50 - shimmerWidth / 2}%,
      rgba(255, 255, 255, 0.1) ${50 - shimmerWidth / 3}%,
      ${shineColor} ${50 - shimmerWidth / 6}%,
      #ffffff 50%,
      ${shineColor} ${50 + shimmerWidth / 6}%,
      rgba(255, 255, 255, 0.1) ${50 + shimmerWidth / 3}%,
      transparent ${50 + shimmerWidth / 2}%,
      transparent 100%
    )`,
    [angle, shimmerWidth, shineColor],
  )

  return (
    <motion.span
      ref={containerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Base metallic look */}
      <span
        className="relative z-10"
        style={{
          background: `linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.95) 0%,
            rgba(200, 200, 200, 0.9) 50%,
            rgba(180, 180, 180, 0.85) 100%
          )`,
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent",
        }}
      >
        {children}
      </span>

      {/* Shine layers */}
      {["primary", "glow", "line"].map((layer) => (
        <motion.span
          key={layer}
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              layer === "line"
                ? `linear-gradient(
                    ${angle}deg,
                    transparent 0%,
                    transparent 48%,
                    rgba(255, 255, 255, 0.9) 50%,
                    transparent 52%,
                    transparent 100%
                  )`
                : shimmerGradient,
            backgroundSize: "300% 100%",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            color: "transparent",
            filter: layer === "glow" ? "blur(8px)" : undefined,
            opacity: layer === "glow" ? 0.6 : 1,
            zIndex: layer === "primary" ? 20 : layer === "glow" ? 30 : 40,
          }}
          initial={{ backgroundPosition: "150% 0" }}
          animate={
            shouldAnimate
              ? { backgroundPosition: ["-150% 0", "150% 0"] }
              : { backgroundPosition: "150% 0" }
          }
          transition={
            shouldAnimate
              ? {
                  duration,
                  ease: [0.4, 0, 0.2, 1],
                  repeat: trigger === "loop" ? Infinity : 0,
                  repeatDelay: trigger === "loop" ? 0.5 : 0,
                }
              : {}
          }
        >
          {children}
        </motion.span>
      ))}
    </motion.span>
  )
}

export default ShinyText
