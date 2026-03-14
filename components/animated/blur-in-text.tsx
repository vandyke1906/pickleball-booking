"use client"

import { useEffect, useRef, useState, ReactNode } from "react"
import { motion, useInView, Variants } from "framer-motion"

interface BlurInTextProps {
  children: ReactNode
  className?: string
  blurAmount?: number
  duration?: number
  delay?: number
  stagger?: number
  direction?: "in" | "out"
  trigger?: "mount" | "inView" | "hover"
  yOffset?: number
  split?: "letter" | "word" | "none"
}

export const BlurInText = ({
  children,
  className = "",
  blurAmount = 10,
  duration = 0.8,
  delay = 0,
  stagger = 0.05,
  direction = "in",
  trigger = "mount",
  yOffset = 20,
  split = "letter",
}: Readonly<BlurInTextProps>) => {
  const containerRef = useRef<HTMLSpanElement>(null)
  const isInView = useInView(containerRef, { once: true, amount: 0.5 })
  const [isHovering, setIsHovering] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)

  const shouldAnimate = () => {
    switch (trigger) {
      case "mount":
        return true
      case "inView":
        return isInView
      case "hover":
        return isHovering
      default:
        return false
    }
  }

  useEffect(() => {
    if (shouldAnimate() && !hasAnimated && trigger !== "hover") {
      setHasAnimated(true)
    }
  }, [isInView])

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: split === "none" ? 0 : stagger,
        delayChildren: delay,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: {
      filter: direction === "in" ? `blur(${blurAmount}px)` : "blur(0px)",
      opacity: direction === "in" ? 0 : 1,
      y: direction === "in" ? yOffset : 0,
    },
    visible: {
      filter: direction === "in" ? "blur(0px)" : `blur(${blurAmount}px)`,
      opacity: direction === "in" ? 1 : 0,
      y: direction === "in" ? 0 : yOffset,
      transition: {
        duration,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  }

  // Utility: split text nodes inside children
  const splitContent = (node: ReactNode): ReactNode[] => {
    if (typeof node === "string") {
      if (split === "none") return [node]
      if (split === "word") return node.split(" ")
      return node.split("")
    }
    return [node] // if it's JSX, just return as-is
  }

  const elements = Array.isArray(children) ? children.flatMap(splitContent) : splitContent(children)

  return (
    <motion.span
      ref={containerRef}
      className={`inline-block ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate={shouldAnimate() || hasAnimated ? "visible" : "hidden"}
      onMouseEnter={() => trigger === "hover" && setIsHovering(true)}
      onMouseLeave={() => trigger === "hover" && setIsHovering(false)}
    >
      {elements.map((element, index) => (
        <motion.span
          key={index}
          className="inline-block"
          variants={itemVariants}
          style={{
            whiteSpace: element === " " ? "pre" : "normal",
          }}
        >
          {element}
          {split === "word" &&
            typeof element === "string" &&
            index < elements.length - 1 &&
            "\u00A0"}
        </motion.span>
      ))}
    </motion.span>
  )
}

export default BlurInText
