import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  AdminBookingPayload,
  adminBookingSchema,
  BookingPayload,
  bookingSchema,
} from "@/lib/validation/booking/booking.validation"
import { qKeyBookings } from "@/lib/hooks/booking/booking.hook"
import { qKeyCourts } from "@/lib/hooks/court/court.hook"
import { fetcher } from "@/lib/hooks/common.hook"
import { TStatus } from "@/components/common/badge-status"

async function createBooking(payload: BookingPayload) {
  const parsed = bookingSchema.parse(payload)
  if (!parsed.proofOfPayment) throw new Error("Please upload proof of payment before booking.")

  const formData = new FormData()
  formData.append("date", parsed.date ?? "")
  formData.append("startTime", parsed.startTime)
  formData.append("duration", parsed.duration.toString())
  formData.append("courtIds", JSON.stringify(parsed.courtIds))
  formData.append("fullName", parsed.fullName)
  if (parsed.contactNumber) formData.append("contactNumber", parsed.contactNumber)
  if (parsed.emailAddress) formData.append("emailAddress", parsed.emailAddress)
  formData.append("proofOfPayment", parsed.proofOfPayment)

  const response = await fetch("/api/bookings", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error?.error || "Booking failed")
  }

  return response.json()
}

async function reserveBooking(payload: AdminBookingPayload) {
  const parsed = adminBookingSchema.parse(payload)

  const formData = new FormData()
  formData.append("date", parsed.date ?? "")
  formData.append("startTime", parsed.startTime)
  formData.append("duration", parsed.duration.toString())
  formData.append("courtIds", JSON.stringify(parsed.courtIds))
  formData.append("fullName", parsed.fullName)
  formData.append("contactNumber", parsed.contactNumber ?? "")
  formData.append("emailAddress", parsed.emailAddress ?? "")

  const response = await fetch("/api/bookings/reservation", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error?.error || "Reservation failed")
  }

  return response.json()
}

export function useCreateBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ["create-booking"],
    mutationFn: createBooking,

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["bookings"] })
      const previousBookings = queryClient.getQueryData(["bookings"])
      return { previousBookings }
    },

    onError: (error, _values, context) => {
      if (context?.previousBookings) {
        queryClient.setQueryData(["bookings"], context.previousBookings)
      }
      if (error instanceof Error && "issues" in error) {
        const zodErr = error as any
        toast.error("Validation failed", {
          description: zodErr.issues.map((e: any) => e.message).join(", "),
        })
        return
      }

      toast.error("Booking failed", { description: (error as Error).message })
    },

    onSuccess: () => {
      toast.success("Booking Created", {
        description: "Your booking has been created and it is under review.",
      })
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qKeyCourts.all, exact: false })
      queryClient.invalidateQueries({ queryKey: qKeyBookings.all, exact: false })
    },

    retry: 1,
  })
}

export function useConfirmBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ["confirm-booking"],
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      fetcher(`/api/bookings/confirm/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept }),
      }),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["bookings"] })
      const previousBookings = queryClient.getQueryData(["bookings"])
      return { previousBookings }
    },

    onError: (error, _values, context) => {
      if (context?.previousBookings) {
        queryClient.setQueryData(["bookings"], context.previousBookings)
      }
      if (error instanceof Error && "issues" in error) {
        const zodErr = error as any
        toast.error("Validation failed", {
          description: zodErr.issues.map((e: any) => e.message).join(", "),
        })
        return
      }

      toast.error("Confirm Booking failed", { description: (error as Error).message })
    },

    onSuccess: (data: any) => {
      const status: TStatus | null = data?.status || null
      if (status) {
        switch (status) {
          case "confirmed":
            toast.success("Confirm Booking", {
              description: `Booking has been confirmed!`,
            })
            break
          case "cancelled":
            toast.warning("Confirm Booking", {
              description: `Booking has been cancelled!`,
            })
            break
        }
      } else
        toast.success("Confirm Booking", {
          description: `Booking has been saved!`,
        })
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qKeyCourts.all, exact: false })
      queryClient.invalidateQueries({ queryKey: qKeyBookings.all, exact: false })
    },

    retry: 1,
  })
}

export function useGetBookingByCode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ["get-booking-code"],
    mutationFn: (code: string) => fetcher(`/api/bookings/${code}`),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["bookings"] })
      const previousBookings = queryClient.getQueryData(["bookings"])
      return { previousBookings }
    },

    onError: (error, _values, context) => {
      if (context?.previousBookings) {
        queryClient.setQueryData(["bookings"], context.previousBookings)
      }
      if (error instanceof Error && "issues" in error) {
        const zodErr = error as any
        toast.error("Validation failed", {
          description: zodErr.issues.map((e: any) => e.message).join(", "),
        })
        return
      }
    },

    onSuccess: () => {},

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qKeyCourts.all, exact: false })
      queryClient.invalidateQueries({ queryKey: qKeyBookings.all, exact: false })
    },

    retry: 1,
  })
}

export function useDeleteBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ["delete-booking-code"],
    mutationFn: (bookingId: string) =>
      fetcher(`/api/bookings/delete/${bookingId}`, { method: "DELETE" }),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["bookings"] })
      const previousBookings = queryClient.getQueryData(["bookings"])
      return { previousBookings }
    },

    onError: (error, _values, context) => {
      if (context?.previousBookings) {
        queryClient.setQueryData(["bookings"], context.previousBookings)
      }
      if (error instanceof Error && "issues" in error) {
        const zodErr = error as any
        toast.error("Validation failed", {
          description: zodErr.issues.map((e: any) => e.message).join(", "),
        })
        return
      }
    },

    onSuccess: () => {},

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qKeyCourts.all, exact: false })
      queryClient.invalidateQueries({ queryKey: qKeyBookings.all, exact: false })
    },

    retry: 1,
  })
}

export function useReserveBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ["reserve-booking"],
    mutationFn: reserveBooking,

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["bookings"] })
      const previousBookings = queryClient.getQueryData(["bookings"])
      return { previousBookings }
    },

    onError: (error, _values, context) => {
      if (context?.previousBookings) {
        queryClient.setQueryData(["bookings"], context.previousBookings)
      }
      if (error instanceof Error && "issues" in error) {
        const zodErr = error as any
        toast.error("Validation failed", {
          description: zodErr.issues.map((e: any) => e.message).join(", "),
        })
        return
      }

      toast.error("Reservation failed", { description: (error as Error).message })
    },

    onSuccess: () => {
      toast.success("Reservation Created", {
        description: "Reservation of courts has been created.",
      })
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qKeyCourts.all, exact: false })
      queryClient.invalidateQueries({ queryKey: qKeyBookings.all, exact: false })
    },

    retry: 1,
  })
}
