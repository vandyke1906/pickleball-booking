"use client"

import { motion } from "framer-motion"
import { Clock, Smartphone, Store, Coffee } from "lucide-react"

const features = [
  { icon: Clock, title: "24/7 Booking", desc: "Book courts any time of day" },
  { icon: Smartphone, title: "Mobile Ready", desc: "Book from your phone in seconds" },
  { icon: Store, title: "Indigos Shop", desc: "Exclusive gear and partner deals" },
  { icon: Coffee, title: "Coffee & Chill", desc: "Relax with drinks after a game" },
]

export function Features() {
  return (
    <div className="py-24 px-5 sm:px-8 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-5">Why players choose us</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Simple, fast, and reliable court booking built for pickleball lovers.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.1 }}
              className="bg-gray-50 border rounded-2xl p-8 hover:shadow-xl hover:shadow-gray-100/80 transition-all group"
            >
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <f.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
              <p className="text-gray-600">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
