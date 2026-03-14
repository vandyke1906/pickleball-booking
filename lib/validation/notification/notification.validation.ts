import { z } from "zod"

const allowedTypes = ["info", "success", "warning", "error"] as const

export const NotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  link: z.string().optional(),
  type: z.string().refine((val) => allowedTypes.includes(val as (typeof allowedTypes)[number]), {
    message: "Invalid notification type",
  }),
  message: z.string(),
  isRead: z.boolean(),
  createdAt: z.string(),
})

export type NotificationData = z.infer<typeof NotificationSchema>
