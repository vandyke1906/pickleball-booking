"use client"

import ShinyText from "@/components/animated/shiny-text"
import TextGenerateEffect from "@/components/animated/typewriter"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { Clock, Smartphone, Store, Coffee } from "lucide-react"
import Link from "next/link"

const features = [
  {
    icon: Store,
    title: "Indigos",
    desc: "Delicious food and snacks to fuel your day",
    img: "/images/indigos.jpg",
    link: "https://www.facebook.com/profile.php?id=61567342252708",
  },
  {
    icon: Coffee,
    title: "CoffeeJ",
    desc: "Your go-to coffee spot to unwind after a game",
    img: "/images/coffeeJ.jpg",
    link: "https://www.facebook.com/profile.php?id=61582083129843",
  },
  {
    icon: Clock,
    title: "24/7 Booking",
    desc: "Book courts any time of day",
    img: "/images/booking.jpg",
    backgroundOnly: true,
  },
  {
    icon: Smartphone,
    title: "Mobile Ready",
    desc: "Book from your phone in seconds",
    img: "/images/mobile-ready.jpg",
    backgroundOnly: true,
  },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.25 },
  },
}

export function Features() {
  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, damping: 25 },
    },
  }
  return (
    <div className="py-24 sm:py-4 px-5 sm:px-8">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative w-full max-w-6xl mx-auto text-center"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <ShinyText
              duration={3}
              shimmerWidth={200}
              trigger="loop"
              shineColor="rgba(255, 255, 255, 1)"
            >
              <h2 className="text-4xl sm:text-5xl font-bold mb-5">Why players choose us</h2>
            </ShinyText>

            <p className="text-xl text-slate-100 max-w-2xl mx-auto">
              <TextGenerateEffect>
                Simple, fast, and reliable court booking built for pickleball lovers.
              </TextGenerateEffect>
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => {
              const CardContent = (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ delay: i * 0.1 }}
                  variants={variants}
                  className={cn(
                    "relative border rounded-2xl p-8 hover:shadow-xl hover:shadow-gray-100/80 transition-all group overflow-hidden",
                    !f.img && "bg-green-900/50", // transparent background fallback
                  )}
                  style={
                    f.img
                      ? {
                          backgroundImage: `url(${f.img})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          opacity: 0.9, // slight transparency
                        }
                      : undefined
                  }
                >
                  {/* Blurry overlay for readability */}
                  {f.img && (
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-md rounded-2xl pointer-events-none" />
                  )}

                  <div className="relative z-10">
                    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors overflow-hidden">
                      {f.img && !f.backgroundOnly ? (
                        <img
                          src={f.img}
                          alt={f.title}
                          className="h-full w-full object-cover rounded-xl"
                        />
                      ) : (
                        <f.icon className="h-7 w-7 text-slate-100" />
                      )}
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-white">{f.title}</h3>
                    <p className="text-gray-100">{f.desc}</p>
                  </div>
                </motion.div>
              )

              return f.link ? (
                <Link
                  key={f.title}
                  href={f.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  {CardContent}
                </Link>
              ) : (
                CardContent
              )
            })}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
