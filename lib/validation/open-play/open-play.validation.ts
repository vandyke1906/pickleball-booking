import { PlayerSkill } from "@/.config/prisma/generated/prisma"
import { dateOnlySchema } from "@/lib/validation/util.validation"
import z from "zod"

export const openPlaySchema = z.object({
  id: z.string().optional(),
  date: dateOnlySchema(true),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be HH:mm"),
  duration: z.number().min(1).max(16),
  transitionMinutes: z.number({ error: "Transition minutes is required" }).min(1),
  preparationSeconds: z.number().min(1),
  courtIds: z.array(z.string()).nonempty("At least one court must be selected"),
  groupSkills: z
    .array(
      z.object({
        skills: z.array(z.enum(PlayerSkill)).min(1, "At least one skill must be selected"),
      }),
    )
    .min(1, "At least one court with skill must be selected"),
})
export type OpenPlayPayload = z.infer<typeof openPlaySchema>

export const openPlayPlayerSchema = z.object({
  openPlayId: z.string().min(1, "Open Play ID is required"),
  playerName: z.string().min(2, "Player name must be at least 2 characters").max(100),
  code: z
    .string()
    .min(1, "Player code is required")
    .max(20, "Player code must be at most 20 characters")
    .regex(/^\S+$/, "Player code must not contain spaces")
    .transform((val) => val.toUpperCase()),
  totalPlayTime: z.number().min(1),
  skill: z.enum(PlayerSkill, { error: "Invalid skill" }),
})
export type OpenPlayPlayerPayload = z.infer<typeof openPlayPlayerSchema>

export const openPlayLineupSchema = z.object({
  openPlayId: z.string().optional(),
  code: z.string().min(1, "Player code is required"),
})
export type OpenPlayLineupPayload = z.infer<typeof openPlayLineupSchema>

//for regisration with players
export const openPlayPlayerRegistrationSchema = openPlayPlayerSchema
  .omit({
    totalPlayTime: true,
  })
  .extend({
    registrationCode: z
      .string()
      .length(6, "Registration code must be exactly 6 characters")
      .regex(/^\S+$/, "Registration code must not contain spaces")
      .transform((val) => val.toUpperCase()),
  })
export type OpenPlayPlayerRegistrationPayload = z.infer<typeof openPlayPlayerRegistrationSchema>
