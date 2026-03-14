"use client"

import { normalizeOpeningHoursClient } from "@/lib/utils"
import { motion } from "framer-motion"
import { Clock, PhilippinePeso, MapPin } from "lucide-react"

type OpeningHour = { startHour: number; endHour: number }
type PricingRule = { startHour: number; endHour: number; price: number }
type Court = { id: string; name: string; location: string }

interface OrgProps {
  openingHours: OpeningHour[]
  pricingRules: PricingRule[]
  courts: Court[]
}

// Convert 24h int to human-readable string
function formatHour(hour: number): string {
  if (hour === 24) return "12:00 AM"
  if (hour > 24) {
    const adjusted = hour - 24
    const suffixNext = adjusted >= 12 ? "PM" : "AM"
    const displayNext = adjusted % 12 === 0 ? 12 : adjusted % 12
    return `${displayNext}:00 ${suffixNext} next day`
  }
  const suffix = hour >= 12 && hour < 24 ? "PM" : "AM"
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:00 ${suffix}`
}

// Format ranges with overnight continuation
function formatRange(start: number, end: number): string {
  if (end > 24) {
    return `${formatHour(start)} – ${formatHour(end)}`
  }
  if (end === 24) {
    return `${formatHour(start)} – 12:00 AM next day`
  }
  return `${formatHour(start)} – ${formatHour(end)}`
}

// Normalize pricing rules (merge overnight and same-price ranges)
export function normalizePricingRulesClient(rules: PricingRule[]): PricingRule[] {
  const sorted = [...rules].sort((a, b) => a.startHour - b.startHour)
  const normalized: PricingRule[] = []

  for (const current of sorted) {
    const prev = normalized[normalized.length - 1]
    if (prev && prev.price === current.price) {
      // Case 1: midnight continuation (24 → 0)
      if (prev.endHour === 24 && current.startHour === 0) {
        prev.endHour = 24 + current.endHour
        continue
      }
      // Case 2: directly adjacent
      if (prev.endHour === current.startHour) {
        prev.endHour = current.endHour
        continue
      }
    }
    normalized.push({ ...current })
  }

  // Extra step: if first block starts at 0 and last block ends at 24 with same price, merge them
  if (
    normalized.length >= 2 &&
    normalized[0].startHour === 0 &&
    normalized[normalized.length - 1].endHour === 24 &&
    normalized[0].price === normalized[normalized.length - 1].price
  ) {
    const last = normalized.pop()!
    last.endHour = 24 + normalized[0].endHour
    normalized.shift()
    normalized.push(last)
  }

  return normalized
}
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.25 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.12, delayChildren: 0.25 },
  },
}

export function OrganizationInfo({ openingHours, pricingRules, courts }: OrgProps) {
  const normalizedHours = normalizeOpeningHoursClient(openingHours)
  const normalizedPricing = normalizePricingRulesClient(pricingRules)

  return (
    <div className="py-10 px-6">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-6xl mx-auto space-y-8"
      >
        {/* Responsive grid: 1 column on mobile, 3 on lg */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Opening Hours */}
          <motion.div
            variants={item}
            className="bg-slate-800/60 rounded-xl p-6 hover:shadow-xl hover:shadow-gray-100/80 transition-all group overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-8 w-8 text-white" />
              <h3 className="text-lg font-semibold text-white">Opening Hours</h3>
            </div>
            <ul className="space-y-2 text-gray-200">
              {normalizedHours.map((h, i) => (
                <li key={i}>{formatRange(h.startHour, h.endHour)}</li>
              ))}
            </ul>
          </motion.div>

          {/* Pricing Rules */}
          <motion.div
            variants={item}
            className="bg-slate-800/60 rounded-xl p-6 hover:shadow-xl hover:shadow-gray-100/80 transition-all group overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-4">
              <PhilippinePeso className="h-8 w-8 text-white" />
              <h3 className="text-lg font-semibold text-white">Pricing</h3>
            </div>
            <ul className="space-y-2 text-gray-200">
              {normalizedPricing.map((p, i) => (
                <li key={i}>
                  {formatRange(p.startHour, p.endHour)} → ₱{p.price}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Courts */}
          <motion.div
            variants={item}
            className="bg-slate-800/60 rounded-xl p-6 hover:shadow-xl hover:shadow-gray-100/80 transition-all group overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-8 w-8 text-white" />
              <h3 className="text-lg font-semibold text-white">Courts</h3>
            </div>
            <ul className="space-y-2 text-gray-200">
              {courts.map((c) => (
                <li key={c.id}>
                  <span className="font-medium">{c.name}</span> — {c.location}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
