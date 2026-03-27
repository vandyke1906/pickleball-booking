"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  calculateDuration,
  formatToPHDateString,
  formatToPHMinutes,
  normalizeOpeningHoursClient,
  parseLocalDate,
} from "@/lib/utils"
import { useMemo, useState } from "react"
import { AlertCircle, Ban, CalendarDays, CheckCircle2, Clock, Loader2, X } from "lucide-react"
import { useReserveBooking } from "@/lib/mutations/booking/booking.mutation"
import { preventDialogCloseProps } from "@/components/dialog/dialog-helper"
import { TBookingDetails } from "@/app/(admin)/admin/(component)/dashboard-admin-page"
import { useForm } from "react-hook-form"
import {
  AdminBookingPayload,
  adminBookingSchema,
} from "@/lib/validation/booking/booking.validation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useCourtBookings, useOrganizationCourts } from "@/lib/hooks/court/court.hook"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, startOfDay } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"

interface DialogProps {
  organizationSlug: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onClose?: () => void
}

export function ReserveBookingDialog({
  organizationSlug,
  open,
  onOpenChange,
  onClose,
}: DialogProps) {
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false)
  const [isDelete, setIsDelete] = useState(false)
  const [acceptBooking, setAcceptBooking] = useState(false)

  const form = useForm<AdminBookingPayload>({
    resolver: zodResolver(adminBookingSchema),
    defaultValues: {
      date: "",
      startTime: "",
      duration: 1,
      courtIds: [],
    },
  })

  const dateString = form.watch("date")
  const date = dateString ? parseLocalDate(dateString) : undefined
  const startTime = form.watch("startTime")
  const duration = form.watch("duration")
  const selectedCourtIds = form.watch("courtIds")

  const mutation = useReserveBooking()

  const { data: orgWithCourts, isLoading: isLoadingOrgWithCourts } = useOrganizationCourts({
    slug: organizationSlug,
  })

  const { data: courtBookings, isLoading: isLoadingCourtBookings } = useCourtBookings({
    enabled: Boolean(dateString),
    organizationId: orgWithCourts?.id || "",
    date: dateString,
  })

  const timeSlots = useMemo(() => {
    if (!orgWithCourts) return []

    const slots: { value: string; label: string }[] = []

    const normalized = normalizeOpeningHoursClient(orgWithCourts.openingHours)

    normalized.forEach(({ startHour, endHour }) => {
      for (let hour = startHour; hour < endHour; hour++) {
        const value = hour.toString().padStart(2, "0") + ":00"

        // Convert to 12‑hour format
        const hour12 = hour % 12 === 0 ? 12 : hour % 12
        const suffix = hour < 12 || hour === 24 ? "AM" : "PM"

        // Add "(next day)" marker if beyond 24
        const label =
          `${hour12.toString().padStart(2, "0")}:00 ${suffix}` + (hour >= 24 ? " (next day)" : "")

        slots.push({ value, label })
      }
    })

    // Default startTime
    if (!form.getValues("startTime") && normalized.length > 0) {
      const firstHour = normalized[0].startHour
      const defaultValue = firstHour.toString().padStart(2, "0") + ":00"
      form.setValue("startTime", defaultValue, { shouldDirty: false })
    }

    return slots
  }, [orgWithCourts, form])

  const allowedDuration = useMemo(() => {
    const selected = form.getValues("startTime")
    if (!selected || !orgWithCourts) return 0

    return calculateDuration(selected, orgWithCourts.openingHours)
  }, [form, orgWithCourts, form.getValues("startTime")])

  const canReserve = useMemo(() => {
    if (!courtBookings || !date) return false

    const courtIds = form.watch("courtIds")
    const startTime = form.watch("startTime")
    const duration = form.watch("duration")

    if (courtIds.length === 0) return false

    // Proposed block in PH minutes
    const [h, m] = startTime.split(":").map(Number)
    let proposedStartMin = h * 60 + m
    let proposedEndMin = proposedStartMin + duration * 60

    // Handle overnight proposal
    if (proposedEndMin >= 24 * 60) {
      proposedEndMin += 24 * 60
    }

    return courtIds.every((courtId) => {
      const currentCourt = courtBookings.find((c) => c.id === courtId)
      const currentBookings = currentCourt?.bookings || []

      for (const booking of currentBookings) {
        const bookingStart = new Date(booking.startTime)
        const bookingEnd = new Date(booking.endTime)

        const sameOrNextDay =
          formatToPHDateString(bookingStart) === formatToPHDateString(date) ||
          formatToPHDateString(bookingEnd) === formatToPHDateString(date)

        if (!sameOrNextDay) continue

        let bookStartMin = formatToPHMinutes(bookingStart)
        let bookEndMin = formatToPHMinutes(bookingEnd)

        // Handle overnight booking
        if (formatToPHDateString(bookingEnd) !== formatToPHDateString(bookingStart)) {
          bookEndMin += 24 * 60
        }

        // Overlap check
        if (proposedStartMin < bookEndMin && proposedEndMin > bookStartMin) {
          return false // overlap found
        }
      }

      return true // no overlap for this court
    })
  }, [courtBookings, date, form])

  const onSubmit = (values: AdminBookingPayload) => {
    if (!canReserve) return
    mutation.mutate(values, {
      onSuccess: (data) => {
        form.reset()
      },
    })
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          onOpenChange(isOpen)
          if (!isOpen && onClose) {
            onClose()
          }
        }}
      >
        <DialogContent {...preventDialogCloseProps}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Reserve Booking</DialogTitle>
              <DialogDescription>Create a reserve booking.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Date */}
                <div className="rounded w-full space-y-2 lg:col-span-2">
                  <Label className="font-semibold text-slate-700">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarDays className="mr-3 h-5 w-5 text-primary" />
                        {dateString
                          ? format(parseLocalDate(dateString), "MMMM dd, yyyy")
                          : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateString ? parseLocalDate(dateString) : undefined}
                        onSelect={(d) => {
                          if (d) {
                            const localDate = startOfDay(d)
                            form.setValue("date", format(localDate, "yyyy-MM-dd"))
                          }
                        }}
                        disabled={(d) => d < startOfDay(new Date())}
                      />
                    </PopoverContent>
                  </Popover>
                  {form.formState.errors.date && (
                    <p className="text-sm text-red-600">{form.formState.errors.date.message}</p>
                  )}
                </div>

                {/* Start Time */}
                <div className="rounded w-full space-y-2">
                  <Label className="font-semibold text-slate-700">Start Time</Label>
                  <Select
                    value={form.watch("startTime")}
                    onValueChange={(v) => form.setValue("startTime", v)}
                  >
                    <SelectTrigger className="h-12 w-full">
                      <Clock className="mr-3 h-5 w-5 text-primary" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.startTime && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.startTime.message}
                    </p>
                  )}
                </div>

                {/* Duration */}
                <div className="rounded w-full space-y-2">
                  <Label className="font-semibold text-slate-700">Duration</Label>
                  <Select
                    value={form.watch("duration").toString()}
                    onValueChange={(v) => form.setValue("duration", Number(v))}
                  >
                    <SelectTrigger className="h-12 w-full" disabled={!startTime}>
                      <Clock className="mr-3 h-5 w-5 text-primary" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: allowedDuration }, (_, i) => i + 1).map((h) => (
                        <SelectItem key={h} value={h.toString()}>
                          {h} hour{h > 1 ? "s" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {!startTime && (
                    <p className="text-xs text-slate-500 mt-2">
                      Please select a start time to enable duration selection.
                    </p>
                  )}
                </div>

                {/* Courts */}
                <div className="lg:col-span-2 space-y-2">
                  <Label className="font-semibold text-slate-700">Select Courts</Label>
                  <p className="text-xs text-muted-foreground">
                    You can book multiple courts at once by checking more than one option.
                  </p>

                  <div className="border rounded-md p-4 bg-slate-50/60 max-h-48 overflow-y-auto space-y-3">
                    {(orgWithCourts?.courts || []).map((court: any) => (
                      <div key={court.id} className="flex items-center space-x-3">
                        <Checkbox
                          disabled={!dateString || !startTime}
                          id={court.id}
                          checked={form.watch("courtIds").includes(court.id)}
                          onCheckedChange={() => {
                            const current = form.getValues("courtIds")
                            if (current.includes(court.id)) {
                              form.setValue(
                                "courtIds",
                                current.filter((id) => id !== court.id),
                              )
                            } else {
                              form.setValue("courtIds", [...current, court.id])
                            }
                          }}
                        />
                        <label htmlFor={court.id} className="text-sm cursor-pointer leading-none">
                          {court.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  {(!dateString || !startTime) && (
                    <p className="text-xs text-slate-500 mt-2">
                      Please select a date and time to enable court selection.
                    </p>
                  )}
                  {form.formState.errors.courtIds && (
                    <p className="text-sm text-red-600">{form.formState.errors.courtIds.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-center mb-4">
              {form.watch("courtIds").length === 0 && (
                <p className="text-sm text-slate-500">Select at least one court to continue</p>
              )}

              {!canReserve && form.watch("courtIds").length > 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  <span>Some selected courts are not available at this time</span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="default" type="submit" disabled={mutation.isPending || !canReserve}>
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Please wait...
                  </>
                ) : canReserve ? (
                  <span className="flex flex-col sm:flex-row items-center sm:justify-center gap-2 sm:gap-1 sm:py-4 text-center">
                    <span className="text-base sm:text-lg font-medium">
                      {`Reserve Now – ${form.watch("courtIds").length} court${
                        form.watch("courtIds").length !== 1 ? "s" : ""
                      }`}
                    </span>
                  </span>
                ) : (
                  <>
                    <Ban className="mr-2 h-5 w-5 animate-pulse" />
                    Not Allowed to Reserve
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
