"use client"

import { format } from "date-fns"
import { cn, formatDateTime, toMinutes } from "@/lib/utils"
import { TCourtWithBooking } from "@/lib/hooks/court/court.hook"
import { Skeleton } from "@/components/ui/skeleton"
interface AvailabilityCourtProps {
  date: Date
  startTime: string
  duration: number
  selectedCourtIds: string[]
  timeSlots: { value: string; label: string }[]
  courtWithBookings: TCourtWithBooking[]
  isLoading: boolean
}

const isBlockAvailableForCourt = (
  court: TCourtWithBooking,
  proposedStart: string,
  dur: number,
  date: Date,
) => {
  const proposedStartMin = toMinutes(proposedStart)
  const proposedEndMin = proposedStartMin + dur * 60

  return !court.bookings.some((b) => {
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

export function AvailabilityCourt({
  date,
  startTime,
  duration,
  selectedCourtIds,
  timeSlots,
  courtWithBookings,
  isLoading,
}: AvailabilityCourtProps & { isLoading?: boolean }) {
  const endTimeDisplay = (() => {
    const [h, m] = startTime.split(":").map(Number)
    const total = h * 60 + m + duration * 60
    const eh = Math.floor(total / 60)
    const em = total % 60
    return `${eh.toString().padStart(2, "0")}:${em.toString().padStart(2, "0")}`
  })()

  return (
    <section className="py-6 px-3 sm:px-6 bg-white rounded-2xl shadow-xl p-6 sm:p-8 lg:p-10 space-y-8">
      <div className="max-w-6xl mx-auto">
        <h3 className="text-lg sm:text-2xl font-semibold mb-4 text-center sm:text-left">
          Court Availability — {format(date, "MMMM d, yyyy")}
        </h3>

        {/* Table for lg+, cards for md and below */}
        <div className="hidden lg:block">
          <CourtAvailabilityTable
            courtWithBookings={courtWithBookings}
            timeSlots={timeSlots}
            isLoading={isLoading}
            selectedCourtIds={selectedCourtIds}
            duration={duration}
            date={date}
          />
        </div>

        <div className="block lg:hidden space-y-3">
          <CourtAvailabilityCards
            courtWithBookings={courtWithBookings}
            timeSlots={timeSlots}
            isLoading={isLoading}
            selectedCourtIds={selectedCourtIds}
            duration={duration}
            date={date}
          />
        </div>

        {!isLoading && (
          <div className="mt-4 text-xs sm:text-sm text-slate-600 text-center">
            Showing {duration}h blocks • {startTime}–{endTimeDisplay} • Selected courts are{" "}
            <strong>highlighted</strong>
          </div>
        )}
      </div>
    </section>
  )
}

interface CourtAvailabilityProps {
  courtWithBookings: TCourtWithBooking[]
  timeSlots: { value: string; label: string }[]
  isLoading: boolean
  selectedCourtIds: string[]
  duration: number
  date: Date
}

interface CourtAvailabilitySkeletonProps {
  courtCount: number
  timeSlotCount: number
}

function CourtAvailabilityTable({
  courtWithBookings,
  timeSlots,
  isLoading,
  selectedCourtIds,
  duration,
  date,
}: CourtAvailabilityProps) {
  if (isLoading) {
    return (
      <CourtAvailabilityTableSkeleton
        courtCount={courtWithBookings.length || 3}
        timeSlotCount={timeSlots.length || 4}
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
      <table className="w-full min-w-[1000px] bg-white text-sm">
        <thead>
          <tr className="bg-slate-100">
            <th className="sticky left-0 z-10 bg-slate-100 p-4 text-left font-semibold border-b border-r border-slate-200 min-w-[140px]">
              Start Time
            </th>
            {courtWithBookings.map((court) => (
              <th
                key={court.id}
                className="p-4 font-semibold border-b border-slate-200 min-w-[180px] text-center"
              >
                {court.name}
                <div className="text-xs text-slate-500 mt-1">₱{court.pricePerHour}/hr</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((time) => (
            <tr key={time.value} className="border-b border-slate-100 hover:bg-slate-50/40">
              <td className="sticky left-0 z-10 bg-white p-4 font-medium border-r border-slate-200">
                {time.label}
              </td>
              {courtWithBookings.map((court) => {
                const isAvailable = isBlockAvailableForCourt(court, time.value, duration, date)
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
                          "bg-red-100 border border-red-300 text-red-800 font-semibold",
                        !isSelected && isAvailable && "bg-green-50 text-green-700",
                        !isSelected &&
                          !isAvailable &&
                          "bg-red-50 border border-red-300 text-red-700",
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
  )
}

export function CourtAvailabilityTableSkeleton({
  courtCount,
  timeSlotCount,
}: CourtAvailabilitySkeletonProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
      <table className="w-full min-w-[1000px] bg-white text-sm">
        <thead>
          <tr className="bg-slate-100">
            <th className="sticky left-0 z-10 bg-slate-100 p-4 text-left font-semibold border-b border-r border-slate-200 min-w-[140px]">
              Start Time
            </th>
            {Array.from({ length: courtCount }).map((_, i) => (
              <th key={i} className="p-4 border-b border-slate-200 min-w-[180px] text-center">
                <Skeleton className="h-5 w-24 mx-auto" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: timeSlotCount }).map((_, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="sticky left-0 z-10 bg-white p-4 border-r border-slate-200">
                <Skeleton className="h-5 w-16" />
              </td>
              {Array.from({ length: courtCount }).map((_, j) => (
                <td key={j} className="p-3 text-center">
                  <Skeleton className="h-8 w-24 mx-auto rounded-md" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CourtAvailabilityCards({
  courtWithBookings,
  timeSlots,
  isLoading,
  selectedCourtIds,
  duration,
  date,
}: CourtAvailabilityProps) {
  if (isLoading) {
    return (
      <CourtAvailabilityCardSkeleton
        courtCount={courtWithBookings.length || 3}
        timeSlotCount={timeSlots.length || 4}
      />
    )
  }

  return (
    <div className="grid gap-2">
      {" "}
      {/* tighter grid spacing */}
      {timeSlots.map((time) => (
        <div
          key={time.value}
          className="rounded-md border border-slate-200 shadow-sm p-2" // reduced padding
        >
          <h4 className="text-xs sm:text-sm font-semibold mb-2">{time.label}</h4>

          <div className="grid gap-2">
            {" "}
            {/* tighter spacing between courts */}
            {courtWithBookings.map((court) => {
              const isAvailable = isBlockAvailableForCourt(court, time.value, duration, date)
              const isSelected = selectedCourtIds.includes(court.id)

              return (
                <div
                  key={court.id}
                  className={cn(
                    "flex items-center justify-between rounded-sm px-2 py-1 text-[11px] sm:text-xs transition-colors duration-200", // compact padding + smaller text
                    isSelected &&
                      isAvailable &&
                      "bg-green-100 border border-green-300 text-green-800 font-semibold",
                    isSelected &&
                      !isAvailable &&
                      "bg-red-100 border border-red-300 text-red-800 font-semibold",
                    !isSelected && isAvailable && "bg-green-50 text-green-700",
                    !isSelected && !isAvailable && "bg-red-50 border border-red-300 text-red-700",
                  )}
                >
                  <span className="font-medium truncate">{court.name}</span>
                  <span>{isAvailable ? "Available" : "Booked"}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
export function CourtAvailabilityCardSkeleton({
  courtCount,
  timeSlotCount,
}: CourtAvailabilitySkeletonProps) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: timeSlotCount }).map((_, i) => (
        <div key={i} className="rounded-lg border border-slate-200 shadow-sm p-4">
          <Skeleton className="h-5 w-24 mb-3" />
          <div className="grid gap-3">
            {Array.from({ length: courtCount }).map((_, j) => (
              <Skeleton key={j} className="h-8 w-full rounded-md" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
