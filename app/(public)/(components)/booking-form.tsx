"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { CalendarDays, Clock, AlertCircle, Loader2, Search, AlertTriangle } from "lucide-react"
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
import { useMemo, useRef, useState } from "react"
import { AvailabilityCourt } from "@/app/(public)/(components)/availability-court"
import { formatDateTime, formatFloat, getEndTime, toMinutes } from "@/lib/utils"
import { useCourtBookings, useOrganizationCourts } from "@/lib/hooks/court/court.hook"
import { useCreateBooking, useGetBookingByCode } from "@/lib/mutations/booking/booking.mutation"
import { useForm } from "react-hook-form"
import { BookingPayload, bookingSchema } from "@/lib/validation/booking/booking.validation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BookingDetailsDialog } from "@/app/(public)/(components)/booking-dialog-details"
import ShinyText from "@/components/animated/shiny-text"
import GlowingWrapper from "@/components/animated/glowing-wrapper"

export default function BookingPage() {
  const refCode = useRef<HTMLInputElement>(null)
  const [bookingDetails, setBookingDetails] = useState(null)
  const [openNotFoundDialog, setOpenNotFoundDialog] = useState(false)

  const form = useForm<BookingPayload>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      date: "",
      startTime: "06:00",
      duration: 1,
      courtIds: [],
      fullName: "",
      contactNumber: "",
      emailAddress: "",
      proofOfPayment: undefined as any,
    },
  })

  const dateString = form.watch("date")
  const date = dateString ? new Date(dateString) : undefined
  const startTime = form.watch("startTime")
  const duration = form.watch("duration")
  const selectedCourtIds = form.watch("courtIds")

  const mutation = useCreateBooking()

  const { data: orgWithCourts, isLoading: isLoadingOrgWithCourts } = useOrganizationCourts()
  const { data: courtBookings, isLoading: isLoadingCourtBookings } = useCourtBookings({
    date: dateString,
  })

  const mutationGetBooking = useGetBookingByCode()

  const selectedOrganization = useMemo(() => {
    if (!orgWithCourts || !orgWithCourts.length) {
      const defaultObj = { openTime: "08:00", closeTime: "20:00", courts: [] }
      return defaultObj
    }
    return orgWithCourts[0]
  }, [orgWithCourts])

  const timeSlots = useMemo(() => {
    if (!selectedOrganization) return []

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

    if (!form.getValues("startTime")) {
      form.setValue("startTime", selectedOrganization.openTime, { shouldDirty: false })
    }

    return slots
  }, [selectedOrganization, form])

  const totalPayment = useMemo(() => {
    const courtIds = form.watch("courtIds") || []
    const duration = form.watch("duration") || 0
    const courts = selectedOrganization?.courts || []

    // Filter courts that match the selected IDs
    const selectedCourts = courts.filter((court) => courtIds.includes(court.id))

    // Sum up their pricePerHour multiplied by duration
    return selectedCourts.reduce((sum, court) => sum + court.pricePerHour * duration, 0)
  }, [form.watch("courtIds"), form.watch("duration"), selectedOrganization?.courts])

  const canBook = useMemo(() => {
    if (!courtBookings || !date) return false

    const courtIds = form.watch("courtIds")
    const startTime = form.watch("startTime")
    const duration = form.watch("duration")

    if (courtIds.length === 0) return false

    const proposedStartMin = toMinutes(startTime)
    const proposedEndMin = proposedStartMin + duration * 60

    return courtIds.every((courtId) => {
      const currentCourt = courtBookings.find((c) => c.id === courtId)
      const currentBookings = currentCourt?.bookings || []

      for (const booking of currentBookings) {
        const bookingStart = formatDateTime(booking.startTime)
        const bookingEnd = formatDateTime(booking.endTime)

        const sameDay =
          bookingStart.toLocaleDateString("en-PH") === date.toLocaleDateString("en-PH")
        if (!sameDay) continue

        const bookStartMin = bookingStart.getHours() * 60 + bookingStart.getMinutes()
        const bookEndMin = bookingEnd.getHours() * 60 + bookingEnd.getMinutes()

        if (proposedStartMin < bookEndMin && proposedEndMin > bookStartMin) {
          return false // overlap found
        }
      }

      return true // no overlap for this court
    })
  }, [courtBookings, date, form])

  const handleFindBooking = () => {
    const code: string = refCode?.current?.value || ""
    if (!code) return
    mutationGetBooking.mutate(code, {
      onSuccess: (result: any) => {
        const { success, data } = result
        if (success) {
          setBookingDetails(data)
          setOpenNotFoundDialog(false)
        } else {
          setOpenNotFoundDialog(true)
        }
      },
      onError: () => {
        setOpenNotFoundDialog(true)
      },
    })
  }

  const onSubmit = (values: BookingPayload) => {
    if (!canBook) return
    mutation.mutate(values, {
      onSuccess: (data) => {
        form.reset()
        setBookingDetails(data?.result)
      },
    })
  }

  return (
    <>
      <div className="min-h-screen">
        {/* Form */}
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="py-10 sm:py-1"
        >
          <div className="max-w-7xl mx-auto">
            {/* Search Bookings */}
            <div className="py-4 my-4 relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2  border rounded-2xl p-8 hover:shadow-xl hover:shadow-gray-100/80 transition-all group overflow-hidden bg-slate-100/80">
              <div className="w-full relative">
                <Label htmlFor="search" className="sr-only">
                  Search
                </Label>
                <Input
                  type="search"
                  ref={refCode}
                  id="search"
                  placeholder="Enter Booking Code..."
                  className="pl-8 flex-1"
                />
                <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none" />
              </div>
              <Button type="button" onClick={handleFindBooking} className="w-full sm:w-auto">
                {mutationGetBooking.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Please wait...
                  </>
                ) : (
                  "Search Booking"
                )}
              </Button>
            </div>

            <ShinyText
              duration={3}
              shimmerWidth={200}
              trigger="loop"
              shineColor="rgba(255, 255, 255, 1)"
            >
              <h1 className="text-3xl sm:text-4xl font-bold text-center mb-10">
                Book Pickl. Digos Court
              </h1>
            </ShinyText>

            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 lg:p-10 space-y-8"
            >
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Date */}
                <div className="rounded w-full space-y-2">
                  <Label className="font-semibold text-slate-700">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarDays className="mr-3 h-5 w-5 text-primary" />
                        {date ? format(date, "MMMM dd, yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateString ? date : undefined}
                        onSelect={(d) => form.setValue("date", format(d!, "yyyy-MM-dd"))}
                        disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
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
                    <SelectTrigger className="h-12 w-full">
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

                {/* Courts */}
                <div className="lg:col-span-3 space-y-2">
                  <Label className="font-semibold text-slate-700">Select Courts</Label>
                  <p className="text-sm text-muted-foreground">
                    You can book multiple courts at once by checking more than one option.
                  </p>

                  <div className="border rounded-md p-4 bg-slate-50/60 max-h-48 overflow-y-auto space-y-3">
                    {(selectedOrganization?.courts || []).map((court) => (
                      <div key={court.id} className="flex items-center space-x-3">
                        <Checkbox
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
                  {form.formState.errors.courtIds && (
                    <p className="text-sm text-red-600">{form.formState.errors.courtIds.message}</p>
                  )}
                </div>
              </div>

              {/* fullName */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="font-semibold text-slate-700">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter Name"
                  {...form.register("fullName")}
                />
                {form.formState.errors.fullName && (
                  <p className="text-sm text-red-600">{form.formState.errors.fullName.message}</p>
                )}
              </div>

              {/* contactNumber */}
              <div className="space-y-2">
                <Label htmlFor="contactNumber" className="font-semibold text-slate-700">
                  Contact Number
                </Label>
                <Input
                  id="contactNumber"
                  type="text"
                  placeholder="Enter Contact Number"
                  {...form.register("contactNumber")}
                />
                {form.formState.errors.contactNumber && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.contactNumber.message}
                  </p>
                )}
              </div>

              {/* emailAddress */}
              <div className="space-y-2">
                <Label htmlFor="emailAddress" className="font-semibold text-slate-700">
                  Email Address
                </Label>
                <Input
                  id="emailAddress"
                  type="email"
                  placeholder="Enter Email"
                  {...form.register("emailAddress")}
                />
                {form.formState.errors.emailAddress && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.emailAddress.message}
                  </p>
                )}
              </div>

              {/* Proof of Payment */}
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">Proof of Payment</Label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => form.setValue("proofOfPayment", e.target.files?.[0] as File)}
                  className="block w-full text-sm text-slate-600"
                />
                {form.formState.errors.proofOfPayment && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.proofOfPayment.message}
                  </p>
                )}
              </div>

              {/* Book Now button */}
              <div className="mt-8 flex flex-col items-center gap-3">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full max-w-md h-14 text-lg font-semibold"
                  disabled={mutation.isPending || !canBook}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Please wait...
                    </>
                  ) : (
                    <span className="flex flex-col sm:flex-row items-center sm:justify-center gap-2 sm:gap-1 sm:py-4 text-center">
                      <span className="text-base sm:text-lg font-medium">
                        {`Book Now – ${form.watch("courtIds").length} court${
                          form.watch("courtIds").length !== 1 ? "s" : ""
                        }`}
                      </span>
                      <span className="font-extrabold text-emerald-300 text-xl sm:text-2xl">
                        {formatFloat(totalPayment)}
                      </span>
                    </span>
                  )}
                </Button>

                {form.watch("courtIds").length === 0 && (
                  <p className="text-sm text-slate-500">Select at least one court to continue</p>
                )}

                {!canBook && form.watch("courtIds").length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-700">
                    <AlertCircle className="h-4 w-4" />
                    <span>Some selected courts are not available at this time</span>
                  </div>
                )}
              </div>
            </form>
            {/* form booking */}
            <div className="mt-4 text-center text-sm text-slate-500">
              {selectedCourtIds.length > 0 && canBook && (
                <>
                  One transaction for all selected courts at {startTime} –{" "}
                  {getEndTime(startTime, duration)}
                </>
              )}
            </div>
          </div>
        </motion.section>

        {/* Availability Table */}
        {dateString && (
          <AvailabilityCourt
            date={date as Date}
            startTime={startTime}
            duration={duration}
            selectedCourtIds={selectedCourtIds}
            timeSlots={timeSlots}
            courtWithBookings={courtBookings}
            isLoading={isLoadingCourtBookings || isLoadingOrgWithCourts}
          />
        )}
      </div>
      {bookingDetails && (
        <BookingDetailsDialog
          booking={bookingDetails}
          open={true}
          onOpenChange={() => setBookingDetails(null)}
        />
      )}
      <DialogNotFound open={openNotFoundDialog} onOpen={setOpenNotFoundDialog} />
    </>
  )
}

function DialogNotFound({ open, onOpen }: { open: boolean; onOpen: any }) {
  return (
    <Dialog open={open} onOpenChange={onOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center text-center space-y-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <DialogTitle className="text-lg font-semibold">Booking Not Found</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            We couldn’t find a booking with that number. Please double-check and try again.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
