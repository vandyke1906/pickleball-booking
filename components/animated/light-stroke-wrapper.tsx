"use client"
import { ReactNode } from "react"
import { motion } from "framer-motion"

export default function LightStrokeWrapper({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`relative rounded-xl ${className}`}>
      {/* Animated stroke border */}
      <motion.svg
        className="absolute inset-0 w-full h-full rounded-xl"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <motion.rect
          x="1"
          y="1"
          width="98"
          height="98"
          rx="12"
          ry="12"
          fill="none"
          stroke="url(#lightStroke)"
          strokeWidth="3"
          strokeDasharray="400"
          strokeDashoffset="400"
          animate={{ strokeDashoffset: 0 }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <defs>
          <linearGradient id="lightStroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#6ee7b7" />
          </linearGradient>
        </defs>
      </motion.svg>

      {/* Content */}
      <div className="relative z-10 rounded-xl overflow-hidden">{children}</div>
    </div>
  )
}
