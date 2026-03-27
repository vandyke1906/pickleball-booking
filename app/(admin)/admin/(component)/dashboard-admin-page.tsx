"use client"

import { BookingDialog } from "@/app/(admin)/admin/(component)/booking-dialog"
import { CalendarSkeleton } from "@/app/(admin)/admin/(component)/calendar-skeleton"
import { ReserveBookingDialog } from "@/app/(admin)/admin/(component)/reserve-booking-dialog"
import BigCalendar from "@/components/big-calendar/big-calendar"
import BadgeStatus from "@/components/common/badge-status"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCourtBookings, useOrganizationCourts } from "@/lib/hooks/court/court.hook"
import { useGetBookingByCode } from "@/lib/mutations/booking/booking.mutation"
import { formatDateTime, toPhilippineTime } from "@/lib/utils"
import { Court } from "@prisma/client"
import { useSession } from "next-auth/react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

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

export default function DashboardAdminPage() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [selectedBooking, setSelectedBooking] = useState<TBookingDetails | null>(null)
  const [openEventDialog, setOpenEventDialog] = useState(false)
  const [openReserveBookingDialog, setOpenReserveBookingDialog] = useState(false)

  const mutationGetBooking = useGetBookingByCode()
  const { data: orgWithCourts, isLoading: isLoadingOrgWithCourts } = useOrganizationCourts({
    slug: session?.user?.organization?.slug || "no_org",
  })

  const { data: courtBookings, isLoading: isLoadingCourtBookings } = useCourtBookings({
    enabled: true,
    organizationId: orgWithCourts?.id || "",
    isAll: true,
    statuses: ["pending", "confirmed", "reserved"],
  })

  const isHourAllowed = useCallback(
    (hour: number) => {
      const openingHours = orgWithCourts?.openingHours || []
      return openingHours.some((h) => hour >= h.startHour && hour < h.endHour)
    },
    [orgWithCourts],
  )

  const removeConfirmationBookingParamCallback = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("confirmation-booking")

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname

    router.replace(newUrl)
  }, [router, pathname, searchParams])

  //min max of calendar
  const { min, max } = useMemo(() => {
    const today = new Date()

    const min = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
    const max = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

    return { min, max }
  }, [courtBookings])

  const courtResources = useMemo(() => {
    if (!orgWithCourts) return []
    return (orgWithCourts.courts || []).map((court) => ({
      id: court.id,
      title: court.name,
    }))
  }, [orgWithCourts, courtBookings])

  const events = useMemo(() => {
    if (!courtBookings || !Array.isArray(courtBookings)) return []

    return courtBookings.flatMap((court) =>
      (court.bookings ?? []).map((booking: any) => {
        const start = toPhilippineTime(new Date(booking.startTime))
        const end = toPhilippineTime(new Date(booking.endTime))

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
          start,
          end: end,
          courts: (booking.courts || []).map((c: any) => ({
            id: c.id,
            name: c.name,
          })),
          resourceId: court.id,
        }
      }),
    )
  }, [courtBookings, orgWithCourts])

  const getEventClassNames = (event: any) => {
    switch (event.status) {
      case "confirmed":
      case "reserved":
        return { className: "confirmed" }
      case "pending":
        return { className: "pending" }
      case "cancelled":
        return { className: "cancelled" }
      default:
        return { className: "default" }
    }
  }

  useEffect(() => {
    const confirmationCode = searchParams.get("confirmation-booking")
    if (!confirmationCode) return
    setSelectedBooking(null)
    mutationGetBooking.mutate(confirmationCode, {
      onSuccess: (result: any) => {
        const { success, data } = result
        if (success) {
          setSelectedBooking(data)
          setOpenEventDialog(true)
        } else {
          setOpenEventDialog(false)
          setSelectedBooking(null)
        }
      },
      onError: () => {
        setSelectedBooking(null)
        setOpenEventDialog(true)
      },
    })
  }, [searchParams])

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header className="p-2 border-b border-gray-200 flex justify-end">
        <Button
          onClick={() => {
            setSelectedBooking(null)
            setOpenReserveBookingDialog(true)
          }}
          className="md:w-auto w-full"
        >
          + Reserve Booking
        </Button>
      </header>
      <main style={{ flex: 1 }} className="relative">
        <BigCalendar
          className="rbc-calendar"
          showMultiDayTimes
          eventPropGetter={getEventClassNames}
          components={{ event: CustomEvent }}
          selectable
          resizable={false}
          draggableAccessor={() => true}
          resizableAccessor={() => false}
          step={60}
          timeslots={1}
          min={min}
          max={max}
          events={events}
          resources={courtResources}
          startAccessor="start"
          endAccessor="end"
          defaultView="day"
          views={["month", "day", "week"]}
          style={{ height: "100%", width: "100%" }}
          onSelecting={(slotInfo) => {
            const hour = slotInfo.start.getHours()
            return isHourAllowed(hour)
          }}
          slotPropGetter={(date) => {
            const hour = date.getHours()
            if (!isHourAllowed(hour)) {
              return {
                style: {
                  backgroundColor: "#0000",
                  pointerEvents: "none",
                  opacity: 0.2,
                },
                className: "rbc-disabled-slot",
              }
            }
            return {}
          }}
          onSelectEvent={(event) => {
            const selected = event as any
            setSelectedBooking(selected)
            setOpenEventDialog(true)
          }}
        />

        {(isLoadingOrgWithCourts || isLoadingCourtBookings) && <CalendarSkeleton />}
      </main>

      {selectedBooking && (
        <BookingDialog
          booking={selectedBooking as TBookingDetails}
          open={openEventDialog}
          onOpenChange={setOpenEventDialog}
          onClose={() => {
            removeConfirmationBookingParamCallback()
            setSelectedBooking(null)
          }}
        />
      )}

      {/* for new booking */}
      {!selectedBooking && (
        <ReserveBookingDialog
          organizationSlug={session?.user?.organization?.slug || ""}
          open={openReserveBookingDialog}
          onOpenChange={setOpenReserveBookingDialog}
          onClose={() => {
            setSelectedBooking(null)
          }}
          onConfirm={() => {
            setSelectedBooking(null)
            setOpenReserveBookingDialog(false)
          }}
        />
      )}
    </div>
  )
}

function CustomEvent({ event }: { event: any }) {
  return (
    <div className="custom-event">
      <div className="rbc-event-label-custom">
        {event.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        {" - "}
        {event.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>
      <div className="rbc-event-content">
        <div key={event.id} className="flex items-center justify-between p-1 text-xs w-full h-full">
          <span className="font-medium truncate leading-none flex items-center">
            {event.bookedBy}
          </span>
          <div className="flex items-center">
            <BadgeStatus status={event.status} />
          </div>
        </div>
      </div>
    </div>
  )
}
