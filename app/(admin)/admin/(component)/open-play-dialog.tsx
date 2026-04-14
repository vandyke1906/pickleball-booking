"use client"

import React, { useEffect, useMemo } from "react"
import { preventDialogCloseProps } from "@/components/dialog/dialog-helper"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarDays, Clock, Loader2 } from "lucide-react"
import { format, startOfDay } from "date-fns"
import { calculateDuration, normalizeOpeningHoursClient, parseLocalDate } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { OpenPlayPayload, openPlaySchema } from "@/lib/validation/open-play/open-play.validation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useOrganizationCourts } from "@/lib/hooks/court/court.hook"
import { useSession } from "next-auth/react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { useCreateOpenPlay } from "@/lib/mutations/open-play/open-play.mutation"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClose?: () => void
  initialData?: OpenPlayPayload
}

export default function OpenPlayDialog({ open, onOpenChange, onClose, initialData }: DialogProps) {
  const { data: session } = useSession()

  console.info({ initialData })

  const { data: orgWithCourts, isLoading: isLoadingOrgWithCourts } = useOrganizationCourts({
    slug: session?.user?.organization?.slug || "no_org",
  })

  const mutation = useCreateOpenPlay()

  const form = useForm<OpenPlayPayload>({
    resolver: zodResolver(openPlaySchema),
    defaultValues: {
      id: initialData?.id || "",
      date: initialData?.date || "",
      startTime: initialData?.startTime || "",
      duration: initialData?.duration || 1,
      transitionMinutes: initialData?.transitionMinutes || 0,
      courtIds: initialData?.courtIds || [],
    },
  })

  const dateString = form.watch("date")
  const startTime = form.watch("startTime")
  const duration = form.watch("duration")

  console.info({ dateString })

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

  const summaryText = useMemo(() => {
    if (!dateString || !startTime || !duration) return "Review the details of this open play."

    const dateObj = parseLocalDate(dateString)

    // Parse start hour
    const [hourStr] = startTime.split(":")
    const startHour = Number(hourStr)

    // Compute end hour
    const endHourRaw = startHour + duration

    // Format helper
    const formatHour = (hour: number) => {
      const normalized = hour % 24
      const hour12 = normalized % 12 === 0 ? 12 : normalized % 12
      const suffix = normalized < 12 ? "AM" : "PM"
      return `${hour12}:00 ${suffix}`
    }

    const formattedDate = format(dateObj, "MMMM d, yyyy (EEEE)")
    const startFormatted = formatHour(startHour)
    const endFormatted = formatHour(endHourRaw)

    return `Review the details of this open play on ${formattedDate} from ${startFormatted} to ${endFormatted}.`
  }, [dateString, startTime, duration])

  useEffect(() => {
    if (orgWithCourts?.openPlayRule)
      form.setValue("transitionMinutes", orgWithCourts.openPlayRule.transitionMinutes, {
        shouldDirty: false,
      })
  }, [orgWithCourts])

  const onSubmit = (values: OpenPlayPayload) => {
    mutation.mutate(values, {
      onSuccess: () => {
        onOpenChange(false)
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
            <fieldset disabled={mutation.isPending || isLoadingOrgWithCourts} className="space-y-6">
              <DialogHeader>
                <DialogTitle>Open Play Form</DialogTitle>
                <DialogDescription>{summaryText}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Date */}
                  <div className="rounded w-full space-y-2">
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

                  {/* Transition Minutes */}
                  <div className="rounded w-full space-y-2">
                    <Label className="font-semibold text-slate-700">Transition Minutes</Label>
                    <Input
                      id="transitionMinutes"
                      type="number"
                      step={5}
                      placeholder="Enter Transition Minutes"
                      required
                      {...form.register("transitionMinutes", { valueAsNumber: true })}
                    />
                    {form.formState.errors.transitionMinutes && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.transitionMinutes.message}
                      </p>
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
                      <p className="text-sm text-red-600">
                        {form.formState.errors.courtIds.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="default" disabled={mutation.isPending || isLoadingOrgWithCourts}>
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Please wait...
                    </>
                  ) : (
                    "Create Open Play"
                  )}
                </Button>
              </DialogFooter>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
