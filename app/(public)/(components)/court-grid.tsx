"use client"

import { motion } from "framer-motion"
import Image from "next/image"

export function CourtGrid() {
  return (
    <section className="py-24 px-5 sm:px-8 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl sm:text-5xl font-bold text-center mb-16">
          Popular Courts Right Now
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="group relative overflow-hidden rounded-2xl shadow-lg shadow-black/5 bg-white"
            >
              <div className="aspect-[4/3] relative">
                {/* <Image
                  src={`https://images.unsplash.com/photo-16${i}000000-0000-0000-0000-00000000000${i}?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`}
                  alt="court"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                /> */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h3 className="text-2xl font-bold">Court {i} • QC Sports Hub</h3>
                <p className="mt-2 opacity-90">₱480 / hour • Indoor • Lights</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
