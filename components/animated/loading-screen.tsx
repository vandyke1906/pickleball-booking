import { Skeleton } from "@/components/ui/skeleton"
import { easeOut, motion, Variants } from "framer-motion"

interface LoadingScreenProps {
  message?: string
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
}

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: easeOut,
    },
  },
}

const dots: Variants = {
  hidden: { opacity: 0.3, scale: 0.8 },

  show: (i: number) => ({
    opacity: 1,
    scale: [1, 1.3, 1],
    transition: {
      repeat: Infinity,
      duration: 0.8,
      delay: i * 0.15,
      ease: "easeInOut",
    },
  }),
}

export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xs"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="flex flex-col items-center justify-center space-y-8"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Skeleton block */}
        <motion.div className="space-y-2" variants={item}>
          <Skeleton className="h-8 w-[250px] bg-muted/50" />
          <Skeleton className="h-8 w-[200px] bg-muted/50" />
        </motion.div>

        {/* Loader */}
        <motion.div className="flex flex-col items-center justify-center space-y-4" variants={item}>
          <div className="flex space-x-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                custom={i}
                variants={dots}
                initial="hidden"
                animate="show"
                className="h-4 w-4 rounded-full bg-primary"
              />
            ))}
          </div>

          <p className="text-sm text-muted-foreground">{message}</p>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
