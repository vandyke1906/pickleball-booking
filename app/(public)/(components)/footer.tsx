"use client"

import { Mail, Phone, MapPin } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import BlurInText from "@/components/animated/blur-in-text"
import TextGenerateEffect from "@/components/animated/typewriter"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.25 },
  },
}
export function Footer() {
  return (
    <footer className=" text-slate-300">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-16 pb-12">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative z-10 w-full max-w-6xl mx-auto text-center"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8 mb-16">
            {/* Brand & Description */}
            <div className="md:col-span-3">
              <BlurInText split="word" trigger="inView">
                <h3 className="text-2xl font-bold text-white mb-4">PICKL. Digos</h3>
                <div className="space-y-4 text-slate-100 mb-6">
                  <p>
                    At <span className="font-semibold">PICKL. Digos</span>, we bring together sport,
                    wellness, and social life in one vibrant destination.
                  </p>
                  <p>
                    Step onto our courts and feel the excitement of pickleball, then cool down with
                    our freshly made smoothies, juices, and healthy meals.
                  </p>
                  <p>
                    Our relaxing tambayan area is the perfect spot to laugh, bond, and create
                    memories after every game.
                  </p>
                  <p>This is not just a place to play — it’s a place to belong.</p>
                </div>
              </BlurInText>
            </div>

            {/* Contact Info */}
            <div>
              <BlurInText split="word" trigger="inView">
                <h4 className="text-lg font-semibold text-white mb-6">Get in Touch</h4>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-white mt-1 flex-shrink-0" />
                    <span>
                      Sta Ana Road , Beside Citta de Oro Subdivision (Inside Calibjo Rice Milling),
                      Brgy Tres de Mayo , Digos City , Davao del sur , 8002 Philippines
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-white" />
                    <span>0962 814 9964</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-white" />
                    <span>pickl.digos@gmail.com</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="flex flex-col gap-2">
                      <Link
                        href="https://www.facebook.com/profile.php?id=61554303354722"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-slate-100 hover:text-white hover:bg-slate-800/50 rounded p-1"
                      >
                        <FacebookIcon className="h-5 w-5" />
                        <span>PICKL. Digos on Facebook</span>
                      </Link>
                      <Link
                        href="https://www.tiktok.com/@pickl.digos"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-slate-100 hover:text-white hover:bg-slate-800/50 rounded p-1"
                      >
                        <TikTokIcon className="h-5 w-5" />
                        <span>@pickl.digos</span>
                      </Link>
                    </span>
                  </li>
                </ul>
              </BlurInText>
            </div>
          </div>

          <div className="pt-10 text-center text-sm text-slate-100 relative">
            {/* Animated border line */}
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "100%" }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className="absolute top-0 left-0 h-[1px] bg-slate-300"
            />

            <BlurInText split="word" trigger="inView">
              <p>© {new Date().getFullYear()} PICKL. Digos. All rights reserved.</p>
            </BlurInText>

            <p className="mt-2">
              <BlurInText split="word" trigger="inView">
                We bring together sport, wellness, and social life in one vibrant destination
              </BlurInText>
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  )
}

function TikTokIcon({ className }: { className: any }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
    >
      <path d="M168 0h-32v176a48 48 0 1 1-48-48h16v-32h-16a80 80 0 1 0 80 80V96c13 10 29 16 48 16V80c-11 0-22-4-32-10s-16-17-16-30V0z" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
    >
      <path d="M128 0C57.3 0 0 57.3 0 128c0 63.9 47.1 116.7 108.5 126v-89h-32v-37h32v-28c0-31.5 19-49 47.1-49 13.6 0 27.9 2.4 27.9 2.4v31h-15.7c-15.5 0-20.3 9.6-20.3 19.4v24h34.6l-5.5 37h-29.1v89C208.9 244.7 256 191.9 256 128 256 57.3 198.7 0 128 0z" />
    </svg>
  )
}
