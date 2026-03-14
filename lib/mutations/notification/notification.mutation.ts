import { notificationKeys } from "@/lib/hooks/notification/notification.hook"
import {
  markALlNotificationAsRead,
  markNotificationAsRead,
} from "@/lib/server/action/notification.action"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export function useMutateMarkAsReadNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ["mark-as-read"],

    mutationFn: async (values: { id: string }) => {
      const { id = "" } = values
      return markNotificationAsRead(id)
    },

    onMutate: async (values) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all })
      const previousPartners = queryClient.getQueryData(notificationKeys.all)
      return { previousPartners }
    },

    onError: (error, values, context) => {
      if (context?.previousPartners)
        queryClient.setQueryData(notificationKeys.all, context.previousPartners)
      toast.error("Failed to mark message as read")
    },

    onSuccess: () => {},

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all, exact: false })
    },
    retry: 1,
  })
}

export function useMutateMarkAllAsReadNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ["clear-notifications"],

    mutationFn: async () => {
      return markALlNotificationAsRead()
    },

    onMutate: async (values) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all })
      const previousPartners = queryClient.getQueryData(notificationKeys.all)
      return { previousPartners }
    },

    onError: (error, values, context) => {
      if (context?.previousPartners)
        queryClient.setQueryData(notificationKeys.all, context.previousPartners)
      toast.error("Failed to clear all notifications")
    },

    onSuccess: () => {},

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all, exact: false })
    },
    retry: 1,
  })
}
