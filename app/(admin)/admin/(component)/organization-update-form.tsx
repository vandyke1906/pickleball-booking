"use client"

import { useForm, useFieldArray, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  OrganizationUpdatePayload,
  organizationUpdateSchema,
} from "@/lib/validation/organization/organization.validation"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarDays, Clock } from "lucide-react"
import { format, startOfDay } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSession } from "next-auth/react"
import { useOrganizationCourts } from "@/lib/hooks/court/court.hook"
import { useEffect } from "react"
import { useUpdateOrganization } from "@/lib/mutations/organization/organization.mutation"

export default function OrganizationUpdateForm() {
  const { data: session } = useSession()

  const mutateUpdateOrg = useUpdateOrganization()
  const { data: orgWithCourts, isLoading: isLoadingOrgWithCourts } = useOrganizationCourts({
    slug: session?.user?.organization?.slug || "",
  })

  const form = useForm<OrganizationUpdatePayload>({
    resolver: zodResolver(organizationUpdateSchema),
    defaultValues: {
      organizationId: "",
      openingHours: [{ startHour: 0, endHour: 1 }],
      pricingRules: [{ startHour: 0, endHour: 1, price: 0 }],
      customPricingRules: [], // optional, so empty array is fine
    },
  })

  // Reset form when orgWithCourts data is available
  useEffect(() => {
    if (orgWithCourts) {
      form.reset({
        organizationId: session?.user.organizationId || "",
        openingHours: orgWithCourts.openingHours || [],
        pricingRules: orgWithCourts.pricingRules || [],
        customPricingRules: orgWithCourts.customPricingRules || [],
      })
    }
  }, [orgWithCourts, form, session])

  const openingHours = form.watch("openingHours") || []
  const openingHoursArray = useFieldArray({ control: form.control, name: "openingHours" })
  const pricingRulesArray = useFieldArray({ control: form.control, name: "pricingRules" })
  const customPricingRulesArray = useFieldArray({
    control: form.control,
    name: "customPricingRules",
  })

  // Example timeSlots array (0–23 hours mapped to human-readable labels)
  const timeSlots = Array.from({ length: 26 }, (_, h) => {
    const label = new Date(0, 0, 0, h % 24).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })
    return {
      value: h.toString(),
      label: h < 24 ? label : `${label} (Next Day)`,
    }
  })

  const onSubmit: SubmitHandler<OrganizationUpdatePayload> = (data: OrganizationUpdatePayload) => {
    mutateUpdateOrg.mutate(data)
  }

  const isBusy = isLoadingOrgWithCourts || mutateUpdateOrg.isPending

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 lg:p-10 space-y-8"
    >
      {/* Opening Hours */}
      <fieldset disabled={isBusy} className="space-y-4 border p-4 rounded">
        <legend className="font-semibold text-lg">Opening Hours</legend>
        {openingHoursArray.fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Start Hour */}
            <div className="space-y-1">
              <Label>Start Hour</Label>
              <Select
                value={form.watch(`openingHours.${index}.startHour`)?.toString()}
                onValueChange={(v) => form.setValue(`openingHours.${index}.startHour`, parseInt(v))}
              >
                <SelectTrigger className="h-12 w-full">
                  <Clock className="mr-3 h-5 w-5 text-primary" />
                  <SelectValue placeholder="Select start hour" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.openingHours?.[index]?.startHour && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.openingHours[index]?.startHour?.message}
                </p>
              )}
            </div>

            {/* End Hour */}
            <div className="space-y-1">
              <Label>End Hour</Label>
              <Select
                value={form.watch(`openingHours.${index}.endHour`)?.toString()}
                onValueChange={(v) => form.setValue(`openingHours.${index}.endHour`, parseInt(v))}
              >
                <SelectTrigger className="h-12 w-full">
                  <Clock className="mr-3 h-5 w-5 text-primary" />
                  <SelectValue placeholder="Select end hour" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((t) => (
                    <SelectItem
                      key={t.value}
                      value={t.value}
                      disabled={
                        form.watch(`openingHours.${index}.startHour`) !== undefined &&
                        parseInt(t.value) <= form.watch(`openingHours.${index}.startHour`)
                      }
                    >
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.openingHours?.[index]?.endHour && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.openingHours[index]?.endHour?.message}
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="destructive"
              onClick={() => openingHoursArray.remove(index)}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          onClick={() => openingHoursArray.append({ startHour: 0, endHour: 1 })}
        >
          Add Opening Hour
        </Button>
      </fieldset>

      {/* Daily Pricing Rules */}
      <fieldset disabled={isBusy} className="space-y-4 border p-4 rounded">
        <legend className="font-semibold text-lg">Daily Pricing Rules</legend>
        {pricingRulesArray.fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            {/* Start Hour */}
            <div className="space-y-1">
              <Label>Start Hour</Label>
              <Select
                value={form.watch(`pricingRules.${index}.startHour`)?.toString()}
                onValueChange={(v) => form.setValue(`pricingRules.${index}.startHour`, parseInt(v))}
              >
                <SelectTrigger className="h-12 w-full">
                  <Clock className="mr-3 h-5 w-5 text-primary" />
                  <SelectValue placeholder="Select start hour" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots
                    .filter((t) => {
                      const hour = parseInt(t.value)
                      return openingHours.some((oh) => hour >= oh.startHour && hour <= oh.endHour)
                    })
                    .map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {form.formState.errors.pricingRules?.[index]?.startHour && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.pricingRules[index]?.startHour?.message}
                </p>
              )}
            </div>

            {/* End Hour */}
            <div className="space-y-1">
              <Label>End Hour</Label>
              <Select
                value={form.watch(`pricingRules.${index}.endHour`)?.toString()}
                onValueChange={(v) => form.setValue(`pricingRules.${index}.endHour`, parseInt(v))}
              >
                <SelectTrigger className="h-12 w-full">
                  <Clock className="mr-3 h-5 w-5 text-primary" />
                  <SelectValue placeholder="Select end hour" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots
                    .filter((t) => {
                      const hour = parseInt(t.value)
                      return openingHours.some((oh) => hour >= oh.startHour && hour <= oh.endHour)
                    })
                    .map((t) => (
                      <SelectItem
                        key={t.value}
                        value={t.value}
                        disabled={
                          form.watch(`pricingRules.${index}.startHour`) !== undefined &&
                          parseInt(t.value) <= form.watch(`pricingRules.${index}.startHour`)
                        }
                      >
                        {t.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {form.formState.errors.pricingRules?.[index]?.endHour && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.pricingRules[index]?.endHour?.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Price</Label>
              <input
                type="number"
                {...form.register(`pricingRules.${index}.price`, { valueAsNumber: true })}
                className="border rounded px-3 py-2 w-full"
              />
              {form.formState.errors.pricingRules?.[index]?.price && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.pricingRules[index]?.price?.message}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => pricingRulesArray.remove(index)}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          onClick={() => pricingRulesArray.append({ startHour: 0, endHour: 1, price: 0 })}
        >
          Add Pricing Rule
        </Button>
      </fieldset>

      {/* Custom Pricing Rules */}
      <fieldset disabled={isBusy} className="space-y-4 border p-4 rounded">
        <legend className="font-semibold text-lg">Custom Pricing Rules</legend>

        {customPricingRulesArray.fields.length === 0 ? (
          <p className="text-sm text-slate-500">
            No custom pricing rules defined. You can add one below.
          </p>
        ) : (
          customPricingRulesArray.fields.map((field, index) => {
            const startDate = form.watch(`customPricingRules.${index}.startDate`)
            const endDate = form.watch(`customPricingRules.${index}.endDate`)

            return (
              <div
                key={field.id}
                className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-center"
              >
                {/* Start Date */}
                <div className="space-y-1">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarDays className="mr-3 h-5 w-5 text-primary" />
                        {startDate
                          ? format(new Date(startDate), "MMMM dd, yyyy")
                          : "Select start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate ? new Date(startDate) : undefined}
                        onSelect={(d) => {
                          if (d) {
                            const localDate = startOfDay(d)
                            form.setValue(`customPricingRules.${index}.startDate`, localDate)

                            // 🔑 Ensure endDate is not earlier than startDate
                            const currentEnd = form.getValues(`customPricingRules.${index}.endDate`)
                            if (!currentEnd || new Date(currentEnd) < localDate) {
                              form.setValue(`customPricingRules.${index}.endDate`, localDate)
                            }
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  {form.formState.errors.customPricingRules?.[index]?.startDate && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.customPricingRules[index]?.startDate?.message}
                    </p>
                  )}
                </div>

                {/* End Date */}
                <div className="space-y-1">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarDays className="mr-3 h-5 w-5 text-primary" />
                        {endDate ? format(new Date(endDate), "MMMM dd, yyyy") : "Select end date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate ? new Date(endDate) : undefined}
                        onSelect={(d) => {
                          if (d) {
                            const localDate = startOfDay(d)
                            form.setValue(`customPricingRules.${index}.endDate`, localDate)
                          }
                        }}
                        disabled={(d) => {
                          const start = startDate ? startOfDay(new Date(startDate)) : null
                          return start ? d < start : false
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  {form.formState.errors.customPricingRules?.[index]?.endDate && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.customPricingRules[index]?.endDate?.message}
                    </p>
                  )}
                </div>

                {/* Start Hour */}
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700">Start Hour</Label>
                  <Select
                    value={form.watch(`customPricingRules.${index}.startHour`)?.toString()}
                    onValueChange={(v) =>
                      form.setValue(`customPricingRules.${index}.startHour`, parseInt(v))
                    }
                  >
                    <SelectTrigger className="h-12 w-full">
                      <Clock className="mr-3 h-5 w-5 text-primary" />
                      <SelectValue placeholder="Select start hour" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots
                        .filter((t) => {
                          const hour = parseInt(t.value)
                          return openingHours.some(
                            (oh) => hour >= oh.startHour && hour <= oh.endHour,
                          )
                        })
                        .map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.customPricingRules?.[index]?.startHour && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.customPricingRules[index]?.startHour?.message}
                    </p>
                  )}
                </div>

                {/* End Hour */}
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700">End Hour</Label>
                  <Select
                    value={form.watch(`customPricingRules.${index}.endHour`)?.toString()}
                    onValueChange={(v) =>
                      form.setValue(`customPricingRules.${index}.endHour`, parseInt(v))
                    }
                  >
                    <SelectTrigger className="h-12 w-full">
                      <Clock className="mr-3 h-5 w-5 text-primary" />
                      <SelectValue placeholder="Select end hour" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots
                        .filter((t) => {
                          const hour = parseInt(t.value)
                          return openingHours.some(
                            (oh) => hour >= oh.startHour && hour <= oh.endHour,
                          )
                        })
                        .map((t) => {
                          const startHour = form.watch(`customPricingRules.${index}.startHour`)
                          const disabled = startHour !== undefined && parseInt(t.value) <= startHour

                          return (
                            <SelectItem key={t.value} value={t.value} disabled={disabled}>
                              {t.label}
                            </SelectItem>
                          )
                        })}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.customPricingRules?.[index]?.endHour && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.customPricingRules[index]?.endHour?.message}
                    </p>
                  )}
                </div>

                {/* Price */}
                <div className="space-y-1">
                  <Label>Price</Label>
                  <input
                    type="number"
                    {...form.register(`customPricingRules.${index}.price`, { valueAsNumber: true })}
                    className="border rounded px-3 py-2 w-full"
                  />
                  {form.formState.errors.customPricingRules?.[index]?.price && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.customPricingRules[index]?.price?.message}
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => customPricingRulesArray.remove(index)}
                >
                  Remove
                </Button>
              </div>
            )
          })
        )}

        <Button
          type="button"
          onClick={() =>
            customPricingRulesArray.append({
              startDate: new Date(),
              endDate: new Date(),
              startHour: 0,
              endHour: 1,
              price: 0,
            })
          }
        >
          Add Custom Pricing Rule
        </Button>
      </fieldset>

      <Button type="submit" className="w-full">
        {isBusy ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  )
}
