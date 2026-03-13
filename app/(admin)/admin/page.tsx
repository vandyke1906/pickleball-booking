"use client"

import { BookingDialog } from "@/app/(admin)/admin/(component)/booking-dialog"
import BigCalendar, { CalendarEvent } from "@/components/big-calendar/big-calendar"
import BadgeStatus from "@/components/common/badge-status"
import { Badge } from "@/components/ui/badge"
import { useCourtBookings, useOrganizationCourts } from "@/lib/hooks/court/court.hook"
import { formatDateTime, formatFloat } from "@/lib/utils"
import { Court } from "@prisma/client"
import { useMemo, useState } from "react"

export type TBookingDetails = {
  id: string
  code: string
  status: string
  bookedBy: string
  contactNumber: string
  emailAddress: string
  proofOfPayment?: string
  totalPrice: string
  start: string
  end: string
  resourceId: string
  courts: Court[]
}

export default function Page() {
  const [selectedBooking, setSelectedBooking] = useState<TBookingDetails | null>(null)
  const [openEventDialog, setOpenEventDialog] = useState(false)
  const { data: orgWithCourts, isLoading: isLoadingOrgWithCourts } = useOrganizationCourts()
  const { data: courtBookings, isLoading: isLoadingCourtBookings } = useCourtBookings({
    isAll: true,
  })

  const selectedOrganization = useMemo(() => {
    if (!orgWithCourts || !orgWithCourts.length) {
      const defaultObj = { openTime: "08:00", closeTime: "20:00", courts: [] }
      return defaultObj
    }
    return orgWithCourts[0]
  }, [orgWithCourts])

  const { min, max } = useMemo(() => {
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

      return { min, max }
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
      (court.bookings ?? []).map((booking: any) => {
        return {
          id: booking.id,
          code: booking.code,
          status: booking.status,
          title: `${booking.fullName ?? ""}`,
          bookedBy: `${booking.fullName ?? ""}`,
          contactNumber: `${booking.contactNumber ?? ""}`,
          emailAddress: `${booking.emailAddress ?? ""}`,
          proofOfPayment: booking.proofOfPaymentLink,
          totalPrice: booking.totalPrice,
          start: formatDateTime(booking.startTime),
          end: formatDateTime(booking.endTime),
          courts: (booking.courts || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            price: c.pricePerHour,
          })),
          resourceId: court.id,
        }
      }),
    )
  }, [selectedOrganization, courtBookings])

  const getEventClassNames = (event: any) => {
    switch (event.status) {
      case "confirmed":
        return { className: "confirmed" }
      case "pending":
        return { className: "pending" }
      case "cancelled":
        return { className: "cancelled" }
      default:
        return { className: "default" }
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header style={{ height: "60px" }}>Booking Calendar</header>
      <main style={{ flex: 1 }}>
        <BigCalendar
          className="rbc-calendar"
          eventPropGetter={getEventClassNames}
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
          startAccessor="start"
          endAccessor="end"
          defaultView="day"
          views={["month", "day", "week"]}
          style={{ height: "100%", width: "100%" }}
          onSelectEvent={(event) => {
            const selected = event as any
            setSelectedBooking(selected)
            setOpenEventDialog(true)
          }}
        />
      </main>
      {selectedBooking && (
        <BookingDialog
          booking={selectedBooking as TBookingDetails}
          open={openEventDialog}
          onOpenChange={setOpenEventDialog}
        />
      )}
    </div>
  )
}

function CustomEvent({ event }: { event: any }) {
  return (
    <div key={event.id} className="flex items-center justify-between p-1 text-xs w-full h-full">
      <span className="font-medium truncate leading-none flex items-center">{event.title}</span>
      <div className="flex items-center">
        <BadgeStatus status={event.status} />
      </div>
    </div>
  )
}
