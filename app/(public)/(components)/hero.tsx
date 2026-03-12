"use client"

import { motion } from "framer-motion"
import { CalendarDays, MapPin, Users } from "lucide-react"
import BookingForm from "@/app/(public)/(components)/booking-form"

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

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-5 sm:px-8 pt-20 pb-24 md:pb-32 bg-gradient-to-br from-slate-50 via-white to-primary/5">
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:28px_28px] opacity-50 pointer-events-none" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-6xl mx-auto text-center"
      >
        <motion.div variants={item}>
          <span className="inline-flex items-center gap-2 px-5 py-2 mb-6 text-sm font-semibold tracking-wide text-primary bg-primary/10 border border-primary/20 rounded-full shadow-sm">
            <MapPin className="h-4 w-4" />
            NOW BOOKING IN DIGOS CITY
          </span>
        </motion.div>

        <motion.h1
          variants={item}
          className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-7 leading-tight bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent"
        >
          Book Pickleball Online
          <br />
          <span className="text-primary">In Just 30 Seconds</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="text-xl sm:text-2xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed"
        >
          Real-time court availability
        </motion.p>

        {/* ─── Booking Form ──────────────────────────────────────── */}
        <BookingForm />

        {/* Social proof */}
        <motion.div
          variants={item}
          className="flex flex-wrap justify-center gap-x-10 gap-y-6 text-sm sm:text-base text-slate-600 font-medium"
        >
          <div className="flex items-center gap-2.5">
            <Users className="h-6 w-6 text-primary" />
            <span>600+ active players monthly</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CalendarDays className="h-6 w-6 text-primary" />
            <span>Book schedule ahead</span>
          </div>
          <div className="flex items-center gap-2.5">
            <MapPin className="h-6 w-6 text-primary" />
            <span>Accessbile Venue</span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
