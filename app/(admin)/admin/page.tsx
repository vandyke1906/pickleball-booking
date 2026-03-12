"use client"

import BigCalendar from "@/components/big-calendar/big-calendar"
import { useCourtBookings, useOrganizationCourts } from "@/lib/hooks/court/court.hook"
import { title } from "process"
import { useMemo, useState } from "react"

export default function Page() {
  const { data: orgWithCourts, isLoading: isLoadingOrgWithCourts } = useOrganizationCourts()
  const { data: courtBookings, isLoading: isLoadingCourtBookings } = useCourtBookings()
  console.info(courtBookings)

  const selectedOrganization = useMemo(() => {
    if (!orgWithCourts || !orgWithCourts.length) {
      const defaultObj = { openTime: "08:00", closeTime: "20:00", courts: [] }
      return defaultObj
    }
    return orgWithCourts[0]
  }, [orgWithCourts])

  const { timeSlots, min, max } = useMemo(() => {
    // default open/close hours
    const defaultOpenHour = 8
    const defaultCloseHour = 20

    if (!selectedOrganization) {
      const today = new Date()
      const min = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        defaultOpenHour,
        0,
      )
      const max = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        defaultCloseHour,
        0,
      )

      return { timeSlots: [], min, max }
    }

    const slots: { value: string; label: string }[] = []
    const [openHour] = selectedOrganization.openTime.split(":").map(Number)
    const [closeHour] = selectedOrganization.closeTime.split(":").map(Number)

    for (let hour = openHour; hour <= closeHour; hour++) {
      const value = hour.toString().padStart(2, "0") + ":00"
      const hour12 = hour % 12 === 0 ? 12 : hour % 12
      const suffix = hour < 12 ? "AM" : "PM"
      const label = `${hour12.toString().padStart(2, "0")}:00 ${suffix}`

      slots.push({ value, label })
    }

    const today = new Date()
    const min = new Date(today.getFullYear(), today.getMonth(), today.getDate(), openHour, 0)
    const max = new Date(today.getFullYear(), today.getMonth(), today.getDate(), closeHour, 0)

    return { timeSlots: slots, min, max }
  }, [selectedOrganization])

  const courtResources = useMemo(() => {
    if (!selectedOrganization?.courts) return []
    return selectedOrganization.courts.map((court) => ({
      id: court.id,
      title: court.name,
    }))
  }, [selectedOrganization])

  const events = useMemo(() => {
    courtBookings.flatMap((court) =>
      court.bookings.map((booking) => ({
        id: booking.id,
        title: `${booking.fullName ?? ""} (${booking.status})`,
        start: new Date(booking.startTime),
        end: new Date(booking.endTime),
        resourceId: court.id, // link booking to its court
      })),
    )
  }, [selectedOrganization])

  const handleSelectSlot = (slotInfo: any) => {
    setEvents([
      ...events,
      {
        id: String(events.length + 1),
        title: "New Booking",
        start: slotInfo.start,
        end: slotInfo.end,
        resourceId: slotInfo.resourceId || "court1", // fallback if none
      },
    ])
  }

  const handleEventDrop = ({ event, start, end, resourceId }: any) => {
    setEvents(events.map((e) => (e.id === event.id ? { ...e, start, end, resourceId } : e)))
  }

  const handleEventResize = ({ event, start, end }: any) => {
    setEvents(events.map((e) => (e.id === event.id ? { ...e, start, end } : e)))
  }

  const getEventClassNames = (event: any) => {
    if (event.type === "meeting") return "event-variant-primary"
    if (event.type === "personal") return "event-variant-secondary"
    if (event.isImportant) return "event-variant-destructive"
    return "event-variant-outline"
  }

  console.info({ timeSlots })

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex-1 min-h-[500px] w-full">
        <BigCalendar
          className="rbc-calendar"
          eventPropGetter={(event) => ({
            className: getEventClassNames(event),
          })}
          selectable
          resizable
          draggableAccessor={() => true}
          resizableAccessor={() => true}
          step={60}
          min={min}
          max={max}
          timeslots={1}
          events={events}
          resources={courtResources}
          onSelectSlot={handleSelectSlot}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          startAccessor="start"
          endAccessor="end"
          defaultView="day"
          style={{ height: "100%", width: "100%" }}
        />
      </div>
    </div>
  )
}
