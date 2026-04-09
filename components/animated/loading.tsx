import { Loader2 } from "lucide-react"
import { motion } from "framer-motion"

interface LoadingProps {
  text?: string
  className?: string
}

export function Loading({ text = "Loading...", className = "" }: LoadingProps) {
  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground ${className}`}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      >
        <Loader2 className="h-8 w-8 text-primary" />
      </motion.div>
      <motion.span
        className="text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        {text}
      </motion.span>
    </div>
  )
}
