import { dateOnlySchema } from "@/lib/validation/util.validation"
import z from "zod"

export const openPlaySchema = z.object({
  date: dateOnlySchema(true),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be HH:mm"),
  duration: z.number().min(1).max(16),
  transitionMinutes: z.number({ error: "Transition minutes is required" }).min(1),
  courtIds: z.array(z.string()).min(1, "At least one court must be selected"),
})
export type OpenPlayPayload = z.infer<typeof openPlaySchema>
