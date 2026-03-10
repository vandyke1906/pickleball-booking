"use client"

import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface AvailabilityCourtProps {
  date: Date
  startTime: string
  duration: number
  selectedCourtIds: string[]
  timeSlots: string[]
  courts: { id: string; name: string; price: number }[]
  // Fixed: now correctly matches the function signature from parent
  isBlockOverlapping: (courtId: string, proposedStart: string, proposedDuration: number) => boolean
}

export function AvailabilityCourt({
  date,
  startTime,
  duration,
  selectedCourtIds,
  timeSlots,
  courts,
  isBlockOverlapping,
}: AvailabilityCourtProps) {
  // Helper – checks if full block is available
  const isBlockAvailableForCourt = (courtId: string, start: string, dur: number) => {
    // No need to loop over individual slots anymore – the overlap function already does it
    return !isBlockOverlapping(courtId, start, dur)
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
                {courts.map((court) => (
                  <th
                    key={court.id}
                    className={cn(
                      "p-4 font-semibold border-b border-slate-200 min-w-[180px] text-center",
                      selectedCourtIds.includes(court.id) && "bg-blue-50/70",
                    )}
                  >
                    {court.name}
                    <div className="text-xs text-slate-500 mt-1">₱{court.price}/hr</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time) => {
                return (
                  <tr key={time} className="border-b border-slate-100 hover:bg-slate-50/40">
                    <td className="sticky left-0 z-10 bg-white p-4 font-medium border-r border-slate-200">
                      {time}
                    </td>

                    {courts.map((court) => {
                      const isAvailable = isBlockAvailableForCourt(court.id, time, duration)
                      const isSelected = selectedCourtIds.includes(court.id)

                      return (
                        <td key={court.id} className="p-3 text-center">
                          <div
                            className={cn(
                              "py-3 px-4 rounded font-medium text-sm transition-colors",
                              isSelected
                                ? isAvailable
                                  ? "bg-green-100 border border-green-300 text-green-800 font-semibold"
                                  : "bg-red-100 border border-red-300 text-red-800"
                                : isAvailable
                                  ? "bg-green-50/60 text-green-700"
                                  : "bg-slate-100 text-slate-500",
                            )}
                          >
                            {isAvailable ? "Available" : "Booked"}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 text-sm text-slate-600 text-center">
          Showing {duration}h continuous blocks • from {startTime} to {endTimeDisplay} • Selected
          courts are <strong>highlighted</strong>
        </div>
      </div>
    </section>
  )
}
