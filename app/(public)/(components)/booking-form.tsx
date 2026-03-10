"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { CalendarDays, Clock, AlertCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"
import { useCallback, useMemo, useState } from "react"
import { AvailabilityCourt } from "@/app/(public)/(components)/availability-court"
import { cn } from "@/lib/utils"
import { useBookings } from "@/lib/hooks/booking/booking.hook"
import { useCourts } from "@/lib/hooks/court/court.hook"
import { Booking } from "@prisma/client"

const TIME_SLOTS = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
]
// const COURTS = [
//   { id: "court1", name: "QC Hub - Court 1 (Indoor)", price: 550 },
//   { id: "court2", name: "QC Hub - Court 2 (Indoor)", price: 550 },
//   { id: "court3", name: "Fairview - Court A (Outdoor)", price: 450 },
//   { id: "court4", name: "UP Diliman - Court 3 (Covered)", price: 500 },
//  ]

// const DUMMY_BOOKINGS = [
//   {
//     courtId: "court1",
//     courtName: "QC Hub - Court 1 (Indoor)",
//     startTime: "08:00",
//     endTime: "10:00",
//   },
//   {
//     courtId: "court1",
//     courtName: "QC Hub - Court 1 (Indoor)",
//     startTime: "18:00",
//     endTime: "20:00",
//   },
//   {
//     courtId: "court2",
//     courtName: "QC Hub - Court 2 (Indoor)",
//     startTime: "10:00",
//     endTime: "13:00",
//   },
//   {
//     courtId: "court3",
//     courtName: "Fairview - Court A (Outdoor)",
//     startTime: "07:00",
//     endTime: "08:00",
//   },
//   {
//     courtId: "court3",
//     courtName: "Fairview - Court A (Outdoor)",
//     startTime: "14:00",
//     endTime: "16:00",
//   },
//   {
//     courtId: "court4",
//     courtName: "UP Diliman - Court 3 (Covered)",
//     startTime: "09:00",
//     endTime: "10:00",
//   },
//   {
//     courtId: "court4",
//     courtName: "UP Diliman - Court 3 (Covered)",
//     startTime: "13:00",
//     endTime: "14:00",
//   },
//   {
//     courtId: "court4",
//     courtName: "UP Diliman - Court 3 (Covered)",
//     startTime: "21:00",
//     endTime: "22:00",
//   },
// ]
function getEndTime(start: string, durationHours: number): string {
  const [h, m] = start.split(":").map(Number)
  const totalMin = h * 60 + m + durationHours * 60
  const endH = Math.floor(totalMin / 60) % 24
  const endM = totalMin % 60
  return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`
}
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

function toMinutesFromDateTime(dateTime: string | Date): number {
  const date = typeof dateTime === "string" ? new Date(dateTime) : dateTime
  return date.getHours() * 60 + date.getMinutes()
}

/**
 * Converts a Date to "HH:mm" string
 */
// function dateToTimeString(date: Date) {
//   const h = date.getHours()
//   const m = date.getMinutes()
//   return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
// }

//  function isBlockOverlappingWithBookings(
//   courtId: string,
//   proposedStart: string,
//   proposedDurationHours: number,
//   bookings: Booking[],
// ): boolean {
//   const proposedStartDate = new Date()
//   const [h, m] = proposedStart.split(":").map(Number)
//   proposedStartDate.setHours(h, m, 0, 0)
//   const proposedEndDate = new Date(
//     proposedStartDate.getTime() + proposedDurationHours * 60 * 60 * 1000,
//   )

//   const courtBookings = bookings.filter((b) => b.courtId === courtId)

//   for (const booking of courtBookings) {
//     const bookStart = new Date(booking.startTime)
//     const bookEnd = new Date(booking.endTime)

//     if (!(proposedEndDate <= bookStart || proposedStartDate >= bookEnd)) {
//       return true
//     }
//   }
//   return false
// }

// ──────────────────────────────────────────────────────────────
export default function BookingPage() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [startTime, setStartTime] = useState<string>("18:00")
  const [duration, setDuration] = useState<number>(1)
  const [selectedCourtIds, setSelectedCourtIds] = useState<string[]>([])

  const { data: bookings, isLoadingBookings } = useBookings({ date: date?.toDateString() })
  const { data: courts, isLoadingCourts } = useCourts()
  console.info({ bookings, courts })

  const isBlockOverlappingWithBookings = useCallback(
    (courtId: string, proposedStart: string, proposedDurationHours: number): boolean => {
      if (!bookings) return false

      const proposedStartMin = toMinutes(proposedStart)
      const proposedEndMin = proposedStartMin + proposedDurationHours * 60

      const courtBookings = bookings.filter((b) => b.courtId === courtId)

      for (const booking of courtBookings) {
        const bookStartMin = toMinutesFromDateTime(booking.startTime)
        const bookEndMin = toMinutesFromDateTime(booking.endTime)

        if (!(proposedEndMin <= bookStartMin || proposedStartMin >= bookEndMin)) {
          return true // overlap
        }
      }

      return false
    },
    [bookings],
  )

  const toggleCourt = (courtId: string) => {
    setSelectedCourtIds((prev) =>
      prev.includes(courtId) ? prev.filter((id) => id !== courtId) : [...prev, courtId],
    )
  }

  const endTime = getEndTime(startTime, duration)

  // Check if ALL selected courts are available for the chosen slot
  const canBook =
    selectedCourtIds.length > 0 &&
    selectedCourtIds.every(
      (courtId) => !isBlockOverlappingWithBookings(courtId, startTime, duration),
    )

  const handleBookNow = () => {
    if (!canBook) return

    const formattedDate = date ? format(date, "MMMM d, yyyy") : "—"
    const selectedCourts = courts
      .filter((c) => selectedCourtIds.includes(c.id))
      .map((c) => c.name)
      .join(", ")

    alert(
      `Booking Confirmation (Demo)\n\n` +
        `Date: ${formattedDate}\n` +
        `Time: ${startTime} – ${endTime} (${duration} hour${duration > 1 ? "s" : ""})\n` +
        `Courts: ${selectedCourts}\n\n` +
        `Total courts: ${selectedCourtIds.length}\n` +
        `This would be one transaction for all selected courts.\n\n` +
        `→ In real app: open payment / confirmation modal here`,
    )

    // Future:
    // - calculate total price
    // - send to backend (POST /api/bookings)
    // - show success toast / redirect to confirmation page
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20">
      {/* Form */}
      <motion.section
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="py-10 px-5 sm:px-8"
      >
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-center mb-10">
            Book Pickleball Court
          </h1>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 lg:p-10">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-12 justify-start text-left">
                      <CalendarDays className="mr-3 h-5 w-5 text-primary" />
                      {date ? format(date, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">Start Time</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger className="h-12">
                    <Clock className="mr-3 h-5 w-5 text-primary" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">Duration</Label>
                <Select value={duration.toString()} onValueChange={(v) => setDuration(Number(v))}>
                  <SelectTrigger className="h-12">
                    <Clock className="mr-3 h-5 w-5 text-primary" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((h) => (
                      <SelectItem key={h} value={h.toString()}>
                        {h} hour{h > 1 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 lg:row-span-2">
                <Label className="font-semibold text-slate-700">Courts</Label>
                <div className="border rounded-md p-4 bg-slate-50/60 max-h-48 overflow-y-auto space-y-3">
                  {courts.map((court) => (
                    <div key={court.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={court.id}
                        checked={selectedCourtIds.includes(court.id)}
                        onCheckedChange={() => toggleCourt(court.id)}
                      />
                      <label htmlFor={court.id} className="text-sm cursor-pointer leading-none">
                        {court.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Book Now button – in the form */}
            <div className="mt-8 flex flex-col items-center gap-3">
              <Button
                size="lg"
                className="w-full max-w-md h-14 text-lg font-semibold"
                disabled={!canBook}
                onClick={handleBookNow}
              >
                Book Now – {selectedCourtIds.length} court{selectedCourtIds.length !== 1 ? "s" : ""}
              </Button>

              {!canBook && selectedCourtIds.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  <span>Some selected courts are not available at this time</span>
                </div>
              )}

              {selectedCourtIds.length === 0 && (
                <p className="text-sm text-slate-500">Select at least one court to continue</p>
              )}
            </div>

            <div className="mt-4 text-center text-sm text-slate-500">
              {selectedCourtIds.length > 0 && canBook && (
                <>
                  One transaction for all selected courts at {startTime} – {endTime}
                </>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Availability Table */}
      {date && (
        <AvailabilityCourt
          date={date}
          startTime={startTime}
          duration={duration}
          selectedCourtIds={selectedCourtIds}
          timeSlots={TIME_SLOTS}
          courts={courts}
          isBlockOverlapping={isBlockOverlappingWithBookings}
        />
      )}

      {!date && (
        <div className="text-center py-16 text-slate-600 text-lg">
          Select a date to see court availability
        </div>
      )}
    </div>
  )
}
