import { dateOnlySchema } from "@/lib/validation/util.validation"
import z from "zod"

export const bookingSchema = z.object({
  date: dateOnlySchema(true),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be HH:mm"),
  duration: z.number().min(1).max(16),
  courtIds: z.array(z.string()).min(1, "At least one court must be selected"),
  fullName: z.string().min(2, "Full name is required"),
  contactNumber: z.string().optional(),
  emailAddress: z.email().optional().or(z.literal("")).optional(),
  proofOfPayment: z
    .instanceof(File, { message: "Proof of payment file is required" })
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: "File size must be less than or equal to 5MB",
    }),
})
export type BookingPayload = z.infer<typeof bookingSchema>

export const adminBookingSchema = z.object({
  date: dateOnlySchema(true),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be HH:mm"),
  duration: z.number().min(1).max(16),
  courtIds: z.array(z.string()).min(1, "At least one court must be selected"),
})
export type AdminBookingPayload = z.infer<typeof adminBookingSchema>
