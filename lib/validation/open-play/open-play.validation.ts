import { dateOnlySchema } from "@/lib/validation/util.validation"
import z from "zod"

export const openPlaySchema = z.object({
  id: z.string().optional(),
  date: dateOnlySchema(true),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be HH:mm"),
  duration: z.number().min(1).max(16),
  transitionMinutes: z.number({ error: "Transition minutes is required" }).min(1),
  preparationSeconds: z.number().min(1),
  courtIds: z.array(z.string()).min(1, "At least one court must be selected"),
})
export type OpenPlayPayload = z.infer<typeof openPlaySchema>

export const openPlayPlayerSchema = z.object({
  openPlayId: z.string().min(1, "Open Play ID is required"),
  playerName: z.string().min(2, "Player name must be at least 2 characters").max(100),
  contactNumber: z.string().min(1, "Contact number is required"),
  emailAddress: z.email({ message: "Invalid email address" }),
  code: z.string().min(1, "Player code is required"),
  totalPlayTime: z.number().min(1),
})
export type OpenPlayPlayerPayload = z.infer<typeof openPlayPlayerSchema>

export const openPlayLineupSchema = z.object({
  openPlayId: z.string().optional(),
  code: z.string().min(1, "Player code is required"),
})
export type OpenPlayLineupPayload = z.infer<typeof openPlayLineupSchema>
