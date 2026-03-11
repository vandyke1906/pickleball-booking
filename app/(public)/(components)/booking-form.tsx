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
import { useCallback, useState } from "react"
import { AvailabilityCourt } from "@/app/(public)/(components)/availability-court"
import { cn, getEndTime, parseLocalDateTime, toMinutes, toMinutesFromDateTime } from "@/lib/utils"
import { useCourtBookings, useCourts } from "@/lib/hooks/court/court.hook"
import { useCreateBooking } from "@/lib/mutations/booking/booking.mutation"
import { useForm } from "react-hook-form"
import { BookingPayload, bookingSchema } from "@/lib/validation/booking/booking.validation"
import { zodResolver } from "@hookform/resolvers/zod"
import { start } from "repl"
import { Input } from "@/components/ui/input"

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

export default function BookingPage() {
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

  const { data: courts, isLoading: isLoadingCourts } = useCourts()
  const { data: courtBookings, isLoading: isLoadingCourtBookings } = useCourtBookings({
    date: dateString,
  })
  const mutation = useCreateBooking()

  const isBlockOverlappingWithBookings = useCallback(
    (courtId: string, proposedStart: string, proposedDurationHours: number): boolean => {
      if (!courtBookings || !date) return false

      const proposedStartMin = toMinutes(proposedStart)
      const proposedEndMin = proposedStartMin + proposedDurationHours * 60

      const currentCourt = courtBookings.find((b) => b.id === courtId)
      const currentBookings = currentCourt?.bookings || []
      for (const booking of currentBookings) {
        const bookingStart = parseLocalDateTime(booking.startTime)
        const bookingEnd = parseLocalDateTime(booking.endTime)

        const sameDay =
          bookingStart.getFullYear() === date.getFullYear() &&
          bookingStart.getMonth() === date.getMonth() &&
          bookingStart.getDate() === date.getDate()

        if (!sameDay) continue

        const bookStartMin = toMinutesFromDateTime(bookingStart)
        const bookEndMin = toMinutesFromDateTime(bookingEnd)

        if (proposedStartMin < bookEndMin && proposedEndMin > bookStartMin) {
          return true
        }
      }

      return false
    },
    [courtBookings, date],
  )

  const canBook =
    form.watch("courtIds").length > 0 &&
    form
      .watch("courtIds")
      .every(
        (courtId) =>
          !isBlockOverlappingWithBookings(courtId, form.watch("startTime"), form.watch("duration")),
      )

  const onSubmit = (values: BookingPayload) => {
    if (!canBook) return
    mutation.mutate(values)
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
          {/* form booking */}

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 lg:p-10 space-y-8"
          >
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Date */}
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-12 justify-start text-left">
                      <CalendarDays className="mr-3 h-5 w-5 text-primary" />
                      {form.watch("date") ? format(date, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.watch("date") ? date : undefined}
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
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">Start Time</Label>
                <Select
                  value={form.watch("startTime")}
                  onValueChange={(v) => form.setValue("startTime", v)}
                >
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
                {form.formState.errors.startTime && (
                  <p className="text-sm text-red-600">{form.formState.errors.startTime.message}</p>
                )}
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">Duration</Label>
                <Select
                  value={form.watch("duration").toString()}
                  onValueChange={(v) => form.setValue("duration", Number(v))}
                >
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

              {/* Courts */}
              <div className="space-y-2 lg:row-span-2">
                <Label className="font-semibold text-slate-700">Courts</Label>
                <div className="border rounded-md p-4 bg-slate-50/60 max-h-48 overflow-y-auto space-y-3">
                  {courts.map((court) => (
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
                Contact Number
              </Label>
              <Input
                id="emailAddress"
                type="email"
                placeholder="Enter Email"
                {...form.register("emailAddress")}
              />
              {form.formState.errors.emailAddress && (
                <p className="text-sm text-red-600">{form.formState.errors.emailAddress.message}</p>
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
                {mutation.isPending
                  ? "Booking..."
                  : `Book Now – ${form.watch("courtIds").length} court${form.watch("courtIds").length !== 1 ? "s" : ""}`}
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
          timeSlots={TIME_SLOTS}
          courtWithBookings={courtBookings}
          isLoading={isLoadingCourtBookings || isLoadingCourts}
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
