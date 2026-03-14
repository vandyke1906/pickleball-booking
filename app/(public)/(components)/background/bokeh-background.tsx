"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export interface BokehBackgroundProps {
  className?: string
  children?: React.ReactNode
  /** Number of bokeh orbs */
  count?: number
  /** Minimum orb size in pixels */
  minSize?: number
  /** Maximum orb size in pixels */
  maxSize?: number
  /** Movement speed multiplier */
  speed?: number
  /** Colors for orbs */
  colors?: string[]
}

interface Orb {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  opacity: number
  pulseOffset: number
  pulseSpeed: number
}

const DEFAULT_COLORS = [
  "rgba(186, 230, 201, 0.3)", // pastel mint green
  "rgba(167, 243, 208, 0.25)", // pastel emerald
  "rgba(187, 247, 208, 0.2)", // light aquamarine green
  "rgba(220, 252, 231, 0.25)", // very soft green
  "rgba(204, 251, 241, 0.2)", // pastel teal-green
]

export function BokehBackground({
  className,
  children,
  count = 25,
  minSize = 50,
  maxSize = 200,
  speed = 1,
  colors = DEFAULT_COLORS,
}: BokehBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = container.getBoundingClientRect()
    let width = rect.width
    let height = rect.height
    canvas.width = width
    canvas.height = height

    let animationId: number
    let tick = 0

    // Create orbs
    const createOrb = (): Orb => {
      const size = minSize + Math.random() * (maxSize - minSize)
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3 * speed,
        vy: (Math.random() - 0.5) * 0.3 * speed,
        size,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 0.15 + Math.random() * 0.2,
        pulseOffset: Math.random() * Math.PI * 2,
        pulseSpeed: 0.005 + Math.random() * 0.01,
      }
    }

    const orbs: Orb[] = Array.from({ length: count }, createOrb)

    // Sort by size for depth (smaller = further back, draw first)
    orbs.sort((a, b) => a.size - b.size)

    // Resize handler
    const handleResize = () => {
      const rect = container.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = width
      canvas.height = height
    }

    const ro = new ResizeObserver(handleResize)
    ro.observe(container)

    // Animation
    const animate = () => {
      tick++
      ctx.clearRect(0, 0, width, height)

      for (const orb of orbs) {
        // Gentle movement
        orb.x += orb.vx
        orb.y += orb.vy

        // Soft bounce at edges
        if (orb.x < -orb.size / 2) orb.x = width + orb.size / 2
        if (orb.x > width + orb.size / 2) orb.x = -orb.size / 2
        if (orb.y < -orb.size / 2) orb.y = height + orb.size / 2
        if (orb.y > height + orb.size / 2) orb.y = -orb.size / 2

        // Subtle pulse
        const pulse = Math.sin(tick * orb.pulseSpeed + orb.pulseOffset) * 0.1 + 1
        const currentSize = orb.size * pulse

        // Draw soft bokeh circle
        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, currentSize / 2)

        // Parse color and adjust for gradient
        gradient.addColorStop(0, orb.color.replace(/[\d.]+\)$/, `${orb.opacity * 1.2})`))
        gradient.addColorStop(0.4, orb.color.replace(/[\d.]+\)$/, `${orb.opacity})`))
        gradient.addColorStop(0.7, orb.color.replace(/[\d.]+\)$/, `${orb.opacity * 0.5})`))
        gradient.addColorStop(1, orb.color.replace(/[\d.]+\)$/, "0)"))

        ctx.beginPath()
        ctx.arc(orb.x, orb.y, currentSize / 2, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()

        // Subtle rim highlight
        ctx.beginPath()
        ctx.arc(orb.x, orb.y, currentSize / 2 - 2, 0, Math.PI * 2)
        ctx.strokeStyle = orb.color.replace(/[\d.]+\)$/, `${orb.opacity * 0.3})`)
        ctx.lineWidth = 1
        ctx.stroke()
      }

      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationId)
      ro.disconnect()
    }
  }, [count, minSize, maxSize, speed, colors])

  return (
    <div
      ref={containerRef}
      className={cn("fixed inset-0 overflow-hidden", className)}
      style={{
        background: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #022c22 100%)",
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Subtle warm overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(ellipse at 30% 30%, rgba(255, 180, 100, 0.15) 0%, transparent 50%)",
        }}
      />

      {/* Vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(10,10,20,0.8) 100%)",
        }}
      />

      {/* Content layer */}
      {children && <div className="relative z-10 h-full w-full">{children}</div>}
    </div>
  )
}
