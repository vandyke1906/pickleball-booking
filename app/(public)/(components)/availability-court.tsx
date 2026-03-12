"use client"

import { format } from "date-fns"
import { cn, formatDateTime, parseLocalDateTime, toMinutes } from "@/lib/utils"
import { TCourtWithBooking } from "@/lib/hooks/court/court.hook"
import { Skeleton } from "@/components/ui/skeleton"
interface AvailabilityCourtProps {
  date: Date
  startTime: string
  duration: number
  selectedCourtIds: string[]
  timeSlots: string[]
  courtWithBookings: TCourtWithBooking[]
  isLoading: boolean
}

export function AvailabilityCourt({
  date,
  startTime,
  duration,
  selectedCourtIds,
  timeSlots,
  courtWithBookings,
  isLoading,
}: AvailabilityCourtProps & { isLoading?: boolean }) {
  const isBlockAvailableForCourt = (
    court: TCourtWithBooking,
    proposedStart: string,
    dur: number,
    date: Date,
  ) => {
    const proposedStartMin = toMinutes(proposedStart)
    const proposedEndMin = proposedStartMin + dur * 60

    return !court.bookings.some((b) => {
      // Convert to PH time for comparison
      const bookingStart = formatDateTime(b.startTime)
      const bookingEnd = formatDateTime(b.endTime)

      // Compare only if same day
      const sameDay = bookingStart.toLocaleDateString("en-PH") === date.toLocaleDateString("en-PH")
      if (!sameDay) return false

      const bookStartMin = bookingStart.getHours() * 60 + bookingStart.getMinutes()
      const bookEndMin = bookingEnd.getHours() * 60 + bookingEnd.getMinutes()

      return proposedStartMin < bookEndMin && proposedEndMin > bookStartMin
    })
  }

  const endTimeDisplay = (() => {
    const [h, m] = startTime.split(":").map(Number)
    const total = h * 60 + m + duration * 60
    const eh = Math.floor(total / 60)
    const em = total % 60
    return `${eh.toString().padStart(2, "0")}:${em.toString().padStart(2, "0")}`
  })()

  return (
    <section className="py-10 px-5 sm:px-8 bg-white">
      <div className="max-w-6xl mx-auto">
        <h3 className="text-2xl font-bold mb-6 text-center sm:text-left">
          Court Availability — {format(date, "MMMM d, yyyy")}
        </h3>

        <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
          <table className="w-full min-w-[1000px] bg-white">
            <thead>
              <tr className="bg-slate-100">
                <th className="sticky left-0 z-10 bg-slate-100 p-4 text-left font-semibold border-b border-r border-slate-200 min-w-[140px]">
                  Start Time
                </th>
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <th key={i} className="p-4 border-b border-slate-200 min-w-[180px]">
                        <Skeleton className="h-5 w-24 mx-auto" />
                      </th>
                    ))
                  : courtWithBookings.map((court) => (
                      <th
                        key={court.id}
                        className={cn(
                          "p-4 font-semibold border-b border-slate-200 min-w-[180px] text-center",
                          selectedCourtIds.includes(court.id) && "bg-blue-50/70",
                        )}
                      >
                        {court.name}
                        <div className="text-xs text-slate-500 mt-1">₱{court.pricePerHour}/hr</div>
                      </th>
                    ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="sticky left-0 z-10 bg-white p-4 border-r border-slate-200">
                        <Skeleton className="h-5 w-16" />
                      </td>
                      {Array.from({ length: 4 }).map((_, j) => (
                        <td key={j} className="p-3 text-center">
                          <Skeleton className="h-8 w-24 mx-auto rounded-md" />
                        </td>
                      ))}
                    </tr>
                  ))
                : timeSlots.map((time) => (
                    <tr key={time} className="border-b border-slate-100 hover:bg-slate-50/40">
                      <td className="sticky left-0 z-10 bg-white p-4 font-medium border-r border-slate-200">
                        {time}
                      </td>
                      {courtWithBookings.map((court) => {
                        const isAvailable = isBlockAvailableForCourt(court, time, duration, date)
                        const isSelected = selectedCourtIds.includes(court.id)

                        return (
                          <td key={court.id} className="p-3 text-center">
                            <div
                              className={cn(
                                "py-2.5 px-4 rounded-md text-sm font-medium transition-colors duration-200",
                                isSelected &&
                                  isAvailable &&
                                  "bg-green-100 border border-green-300 text-green-800 font-semibold",
                                isSelected &&
                                  !isAvailable &&
                                  "bg-amber-100 border border-amber-300 text-amber-800 font-semibold",
                                !isSelected && isAvailable && "bg-green-50 text-green-700",
                                !isSelected && !isAvailable && "bg-amber-50 text-amber-700",
                              )}
                            >
                              {isAvailable ? "Available" : "Booked"}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!isLoading && (
          <div className="mt-6 text-sm text-slate-600 text-center">
            Showing {duration}h continuous blocks • from {startTime} to {endTimeDisplay} • Selected
            courts are <strong>highlighted</strong>
          </div>
        )}
      </div>
    </section>
  )
}
