"use client"
import { motion } from "framer-motion"

type PathDetails = {
  d: string
  fill?: string
  transform?: string
}

type AnimatedSVGProps = {
  paths: PathDetails[]
  viewBox?: string
  strokeWidth?: number
  duration?: number
  className?: string
}

export default function AnimatedSVG({
  paths,
  viewBox = "0 0 900 400",
  strokeWidth = 4,
  duration = 5,
  className = "w-60 h-60",
}: AnimatedSVGProps) {
  return (
    <motion.svg xmlns="http://www.w3.org/2000/svg" viewBox={viewBox} className={className}>
      {paths.map((path, i) => (
        <motion.path
          key={i}
          d={path.d}
          fill={path.fill ?? "none"}
          transform={path.transform}
          stroke="#168E0A" // solid green stroke
          strokeWidth={strokeWidth}
          strokeDasharray="2000"
          strokeDashoffset="2000"
          animate={{ strokeDashoffset: 0 }}
          transition={{
            duration,
            delay: i * 0.5,
            repeat: Infinity,
            ease: "linear",
          }}
          filter="url(#glow)" // ✅ apply glow filter
        />
      ))}

      <defs>
        {/* Glow filter definition */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#168E0A" floodOpacity="0.8" />
        </filter>
      </defs>
    </motion.svg>
  )
}
