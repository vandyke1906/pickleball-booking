"use client"

import BigCalendar, { CalendarEvent } from "@/components/big-calendar/big-calendar"
import { Badge } from "@/components/ui/badge"
import { useCourtBookings, useOrganizationCourts } from "@/lib/hooks/court/court.hook"
import { formatDateTime } from "@/lib/utils"
import { useMemo } from "react"

export default function Page() {
  const { data: orgWithCourts, isLoading: isLoadingOrgWithCourts } = useOrganizationCourts()
  const { data: courtBookings, isLoading: isLoadingCourtBookings } = useCourtBookings()

  const selectedOrganization = useMemo(() => {
    if (!orgWithCourts || !orgWithCourts.length) {
      const defaultObj = { openTime: "08:00", closeTime: "20:00", courts: [] }
      return defaultObj
    }
    return orgWithCourts[0]
  }, [orgWithCourts])

  const { timeSlots, min, max } = useMemo(() => {
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
  }, [selectedOrganization, courtBookings])

  const courtResources = useMemo(() => {
    if (!selectedOrganization?.courts) return []
    return selectedOrganization.courts.map((court) => ({
      id: court.id,
      title: court.name,
    }))
  }, [selectedOrganization, courtBookings])

  const events = useMemo(() => {
    if (!courtBookings || !Array.isArray(courtBookings)) return []

    return courtBookings.flatMap((court) =>
      (court.bookings ?? []).map((booking) => ({
        id: booking.id,
        status: booking.status,
        title: `${booking.fullName ?? ""}`,
        start: formatDateTime(booking.startTime),
        end: formatDateTime(booking.endTime),
        resourceId: court.id,
      })),
    )
  }, [selectedOrganization, courtBookings])

  const getEventClassNames = (event: any) => {
    if (event.status === "confirmed") return "event-variant-primary"
    if (event.status === "pending") return "event-variant-warning"
    if (event.status === "cancelled") return "event-variant-destructive"
    return "event-variant-outline"
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header style={{ height: "60px" }}>Header</header>
      <main style={{ flex: 1 }}>
        <BigCalendar
          className="rbc-calendar"
          // eventPropGetter={(event) => ({
          //   className: getEventClassNames(event),
          // })}
          components={{
            event: CustomEvent,
          }}
          selectable
          resizable={false}
          draggableAccessor={() => true}
          resizableAccessor={() => false}
          step={60}
          min={min}
          max={max}
          timeslots={1}
          events={events}
          resources={courtResources}
          // onSelectSlot={handleSelectSlot}
          // onEventDrop={handleEventDrop}
          // onEventResize={handleEventResize}
          startAccessor="start"
          endAccessor="end"
          defaultView="day"
          views={["month", "day", "week"]}
          style={{ height: "100%", width: "100%" }}
          onSelectEvent={(event) => {
            console.log("Selected event:", event)
          }}
        />
      </main>
    </div>
  )
}

function CustomEvent({ event }: { event: any }) {
  return (
    <div key={event.id} className="flex items-center justify-between p-1 text-xs">
      {/* Title on the left */}
      <span className="font-medium truncate">{event.title}</span>

      {/* Status badge on the right */}
      <Badge
        variant={
          event.status === "confirmed"
            ? "default"
            : event.status === "pending"
              ? "secondary"
              : "destructive"
        }
        className="ml-2"
      >
        {event.status}
      </Badge>
    </div>
  )
}
