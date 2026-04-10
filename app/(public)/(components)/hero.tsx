"use client"

import { motion } from "framer-motion"
import { MapPin } from "lucide-react"
import BookingForm from "@/app/(public)/(components)/booking-form"
import Image from "next/image"
import BlurInText from "@/components/animated/blur-in-text"
import ShinyText from "@/components/animated/shiny-text"
import GradientFlowText from "@/components/animated/gradient-flow-text"
import AnimatedSVG from "@/components/animated/animated-svg"
import { logoPaths } from "@/lib/svg/logo"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.25 },
  },
}

const item = {
  hidden: { y: 28, opacity: 0 },
  show: { y: 0, opacity: 1 },
}

export function Hero({ slug }: { slug: string }) {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-5 sm:px-8 pt-10 pb-10 sm:pb-4">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-6xl mx-auto text-center"
      >
        <motion.div variants={item} className="flex flex-col items-center mb-6">
          <AnimatedSVG paths={logoPaths} viewBox="0 0 1440 514" />

          {/* </div> */}
          <BlurInText split="word" trigger="inView">
            <p className="text-slate-100 text-sm sm:text-base">
              At <span className="font-semibold">PICKL. Digos</span>, we bring together sport,
              wellness, and social life in one vibrant destination.
            </p>
            <p className="text-slate-100 text-sm sm:text-base">
              Step onto our courts and feel the excitement of pickleball, then cool down with our
              freshly made smoothies, juices, and healthy meals. Our relaxing tambayan area is the
              perfect spot to laugh, bond, and create memories after every game.
            </p>
            <p className="text-slate-100 text-sm sm:text-base">
              This is not just a place to play — it’s a place to belong.
            </p>
          </BlurInText>
        </motion.div>

        <motion.div variants={item}>
          <span className="text-slate-100 inline-flex items-center gap-2 px-5 py-2 mb-6 text-sm font-semibold tracking-wide bg-primary/10 border border-primary/20 rounded-full shadow-sm">
            <MapPin className="h-4 w-4" />
            NOW BOOKING @ PICKL. Digos
          </span>
        </motion.div>

        <motion.h1
          variants={item}
          className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-7 leading-tight bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent"
        >
          <ShinyText
            duration={3}
            shimmerWidth={200}
            trigger="loop"
            shineColor="rgba(255, 255, 255, 1)"
          >
            <span className="font-bold">Book at Pickl. Digos Online</span>
          </ShinyText>
          <br />
          <GradientFlowText
            colors={[
              "#a7f3d0", // pastel emerald
              "#bbf7d0", // light mint green
              "#d1fae5", // soft aquamarine
              "#ecfdf5", // very pale green
            ]}
            speed={4}
            angle={90}
            trigger="continuous"
            className="text-4xl font-bold"
          >
            <span>In Just 30 Seconds</span>
          </GradientFlowText>
        </motion.h1>

        <motion.p
          variants={item}
          className="text-xl sm:text-2xl text-slate-100 mb-10 max-w-3xl mx-auto leading-relaxed"
        >
          Real-time court availability
        </motion.p>

        {/* ─── Booking Form ──────────────────────────────────────── */}
        <BookingForm slug={slug} />
      </motion.div>
    </section>
  )
}
