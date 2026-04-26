import { dateOnlySchema } from "@/lib/validation/util.validation"
import z from "zod"

const organizationOpeningHourNormalizedSchema = z
  .object({
    startHour: z.number().int().min(0, "Start hour must be >= 0"),

    endHour: z.number().int().min(1, "End hour must be >= 1"),
  })
  .refine((data) => data.endHour >= data.startHour, {
    message: "End hour must be greater than or equal to start hour",
    path: ["endHour"],
  })

const organizationPricingRuleSchema = z
  .object({
    startHour: z
      .number()
      .int()
      .min(0, "Start hour must be between 0 and 23")
      .max(23, "Start hour must be between 0 and 23"),

    endHour: z
      .number()
      .int()
      .min(1, "End hour must be between 1 and 24")
      .max(24, "End hour must be between 1 and 24"),

    price: z.number().positive("Price must be greater than 0"),
  })
  .refine((data) => data.endHour > data.startHour, {
    message: "End hour must be greater than start hour",
    path: ["endHour"],
  })

const organizationCustomPricingRuleSchema = organizationPricingRuleSchema
  .extend({
    startDate: z.coerce.date({ error: "Start date is required" }) as z.ZodDate,
    endDate: z.coerce.date({ error: "End date is required" }) as z.ZodDate,
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be greater than or equal to start date",
    path: ["endDate"],
  })

export const organizationUpdateSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  openingHours: z
    .array(organizationOpeningHourNormalizedSchema)
    .min(1, "At least one opening hour is required"),
  pricingRules: z
    .array(organizationPricingRuleSchema)
    .min(1, "At least one pricing rule is required"),
  customPricingRules: z.array(organizationCustomPricingRuleSchema).optional(),
})
export type OrganizationUpdatePayload = z.infer<typeof organizationUpdateSchema>
