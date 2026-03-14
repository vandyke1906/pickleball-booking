"use server"

import { isServerAuthenticated } from "@/lib/auth/auth.server"
import { prisma } from "@/lib/prisma"
import { EventBroadcast } from "@/lib/server-event/broadcaster.event"
import { BroadcastEventTypes } from "@/lib/sse-broadcaster.type"
import {
  NotificationData,
  NotificationSchema,
} from "@/lib/validation/notification/notification.validation"
import { startOfDay, endOfDay } from "date-fns"

export async function getUserUnreadNotifications() {
  const session = await isServerAuthenticated()
  if (!session?.user) return []

  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.user.id,
      isRead: false,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      message: true,
      type: true,
      isRead: true,
      createdAt: true,
    },
  })
  const parsed = notifications.map((n) =>
    NotificationSchema.parse({
      ...n,
      type: ["info", "success", "warning", "error"].includes(n.type)
        ? (n.type as "info" | "success" | "warning" | "error")
        : "info",
      createdAt: n.createdAt.toISOString(),
    }),
  )

  return parsed
}

export async function getUserTodayAndUnreadNotifications() {
  const session = await isServerAuthenticated()
  if (!session?.user) return []

  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)

  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.user.id,
      OR: [{ isRead: false }, { createdAt: { gte: todayStart, lte: todayEnd } }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      message: true,
      link: true,
      type: true,
      isRead: true,
      createdAt: true,
    },
  })

  const parsed = notifications.map((n) => {
    return NotificationSchema.parse({
      ...n,
      type: ["info", "success", "warning", "error"].includes(n.type)
        ? (n.type as "info" | "success" | "warning" | "error")
        : "info",
      createdAt: n.createdAt.toISOString(),
    })
  })

  return parsed
}

export async function markNotificationAsRead(id: string) {
  const session = await isServerAuthenticated()
  if (!session?.user || !id) return null
  if (id)
    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    })

  return prisma.notification.updateMany({
    where: {
      userId: session?.user?.id,
    },
    data: { isRead: true },
  })
}

export async function markALlNotificationAsRead() {
  const session = await isServerAuthenticated()
  if (!session?.user) return null
  return await prisma.notification.updateMany({
    where: { userId: session?.user?.id, isRead: false },
    data: { isRead: true },
  })
}

export async function getUserNotifications() {
  const session = await isServerAuthenticated()
  if (!session?.user) return null
  return await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })
}

/**
 * Create and broadcast notifications to all users in an organization
 */
export async function createNotificationForOrg(
  orgId: string,
  payload: Omit<NotificationData, "id" | "createdAt" | "isRead" | "userId">,
) {
  if (!orgId) return []
  //Get all users in the org
  const users = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: { id: true },
  })

  if (users.length === 0) return []

  // Prepare bulk insert data
  const data = users.map((user) => ({
    ...payload,
    userId: user.id,
    isRead: false,
  }))

  //Insert all notifications in one query
  await prisma.notification.createMany({ data })

  // Fetch the inserted notifications (with IDs and timestamps)
  const notifications = await prisma.notification.findMany({
    where: { userId: { in: users.map((u) => u.id) } },
    orderBy: { createdAt: "desc" },
    take: users.length,
  })

  // Broadcast each notification
  notifications.forEach((notification) => {
    EventBroadcast({
      type: BroadcastEventTypes.NOTIFICATION,
      data: notification,
    })
  })

  return notifications
}
