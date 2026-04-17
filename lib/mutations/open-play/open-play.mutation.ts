import { OpenPlayStatus } from "@/.config/prisma/generated/prisma"
import { qKeyOpenPlays } from "@/lib/hooks/open-play/open-play.hook"
import {
  OpenPlayLineupPayload,
  openPlayLineupSchema,
  OpenPlayPayload,
  OpenPlayPlayerPayload,
  openPlayPlayerSchema,
  openPlaySchema,
} from "@/lib/validation/open-play/open-play.validation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

// API functions
async function createOrUpdateOpenPlay(payload: OpenPlayPayload) {
  const parsed = openPlaySchema.parse(payload)

  const formData = new FormData()
  formData.append("id", parsed.id ?? "")
  formData.append("date", parsed.date ?? "")
  formData.append("startTime", parsed.startTime)
  formData.append("duration", parsed.duration.toString())
  formData.append("transitionMinutes", parsed.transitionMinutes.toString())
  formData.append("preparationSeconds", parsed.preparationSeconds.toString())
  formData.append("courtIds", JSON.stringify(parsed.courtIds))

  const response = await fetch("/api/open-plays", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error?.error || "Open Play failed")
  }

  return response.json()
}

async function deleteOpenPlay(id: string) {
  const res = await fetch(`/api/open-plays/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error?.error || "Delete failed")
  }
  return res.json()
}

async function createOpenPlayPlayer(payload: OpenPlayPlayerPayload) {
  const parsed = openPlayPlayerSchema.parse(payload)
  const formData = new FormData()
  formData.append("openPlayId", parsed.openPlayId)
  formData.append("playerName", parsed.playerName)
  formData.append("code", parsed.code ?? "")
  formData.append("contactNumber", parsed.contactNumber ?? "")
  formData.append("emailAddress", parsed.emailAddress ?? "")
  formData.append("totalPlayTime", parsed.totalPlayTime.toString())

  try {
    const response = await fetch("/api/open-plays/players/create", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData?.error || "Player registration failed")
    }

    const data = await response.json()
    return data
  } catch (err) {
    if (err instanceof Error) {
      console.error("Open Play Player creation error:", err.message)
      throw err
    }
    throw new Error("Unexpected error registering player")
  }
}

async function updateOpenPlayPlayer(id: string, payload: Partial<OpenPlayPlayerPayload>) {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, String(value))
  })

  const res = await fetch(`/api/open-plays/players/${id}`, {
    method: "PUT",
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error?.error || "Update failed")
  }

  return res.json()
}

async function deleteOpenPlayPlayer(id: string) {
  const res = await fetch(`/api/open-plays/players/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error?.error || "Delete failed")
  }
  return res.json()
}

async function statusUpdateOpenPlay(id: string, status: OpenPlayStatus) {
  const formData = new FormData()
  formData.append("status", status)
  const res = await fetch(`/api/open-plays/${id}/status-update`, {
    method: "POST",
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error?.error || "Activation failed")
  }

  return res.json()
}

async function submitLineupOpenPlay(payload: OpenPlayLineupPayload) {
  const parsed = openPlayLineupSchema.parse(payload)
  const formData = new FormData()
  formData.append("code", parsed.code ?? "")
  formData.append("openPlayId", parsed.openPlayId ?? "")
  const res = await fetch(`/api/open-plays/lineups/submit`, {
    method: "POST",
    body: formData,
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error?.error || "Submission failed")
  }
  return res.json()
}

async function startActiveOpenPlay(id: string) {
  const formData = new FormData()
  formData.append("status", status)
  const res = await fetch(`/api/open-plays/${id}/start`, { method: "POST" })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error?.error || "Start active Open Play failed")
  }

  return res.json()
}
// endOf API functions

export function useCreateOrUpdateOpenPlay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ["create-or-update-open-play"],
    mutationFn: createOrUpdateOpenPlay,

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["open-plays"] })
      const previousBookings = queryClient.getQueryData(["open-plays"])
      return { previousBookings }
    },

    onError: (error, _values, context) => {
      if (context?.previousBookings) {
        queryClient.setQueryData(["open-plays"], context.previousBookings)
      }
      if (error instanceof Error && "issues" in error) {
        const zodErr = error as any
        toast.error("Validation failed", {
          description: zodErr.issues.map((e: any) => e.message).join(", "),
        })
        return
      }

      toast.error("Open Play failed", { description: (error as Error).message })
    },

    onSuccess: () => {
      toast.success("Open Play Created", {
        description: "Your open play has been created.",
      })
    },

    onSettled: (data) => {
      console.info({ data })
      queryClient.invalidateQueries({ queryKey: qKeyOpenPlays.all, exact: false })
      if (data?.result?.id)
        queryClient.invalidateQueries({ queryKey: qKeyOpenPlays.detail(data?.result?.id) })
    },

    retry: 1,
  })
}

export function useDeleteOpenPlay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteOpenPlay(id),

    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["open-play", id] })
      const previousOpenPlay = queryClient.getQueryData(["open-play", id])

      if (previousOpenPlay) {
        queryClient.setQueryData(["open-play", id], (old: any) => ({
          ...old,
          players: (old.players || []).filter((p: any) => p.id !== id),
        }))
      }

      return { previousOpenPlay }
    },

    onError: (error, { id }, context) => {
      if (context?.previousOpenPlay) {
        queryClient.setQueryData(["open-play", id], context.previousOpenPlay)
      }
      toast.error("Delete failed", { description: (error as Error).message })
    },

    onSuccess: () => {
      toast.success("Openplay deleted", {
        description: "Openplay has been deleted.",
      })
    },

    onSettled: (_data, _error) => {
      queryClient.invalidateQueries({ queryKey: qKeyOpenPlays.all, exact: false })
    },

    retry: 1,
  })
}

export function useCreateOpenPlayPlayer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ["create-open-play-player"],
    mutationFn: createOpenPlayPlayer,

    onMutate: async (newPlayer) => {
      await queryClient.cancelQueries({ queryKey: ["open-play", newPlayer.openPlayId] })

      const previousOpenPlay = queryClient.getQueryData(["open-play", newPlayer.openPlayId])

      if (previousOpenPlay) {
        queryClient.setQueryData(["open-play", newPlayer.openPlayId], (old: any) => ({
          ...old,
          players: [
            ...(old?.players || []),
            {
              ...newPlayer,
              id: "temp-id",
            },
          ],
        }))
      }

      return { previousOpenPlay }
    },

    onError: (error, values, context) => {
      if (context?.previousOpenPlay) {
        queryClient.setQueryData(["open-play", values.openPlayId], context.previousOpenPlay)
      }

      if (error instanceof Error && "issues" in error) {
        const zodErr = error as any
        toast.error("Validation failed", {
          description: zodErr.issues.map((e: any) => e.message).join(", "),
        })
        return
      }

      toast.error("Player registration failed", {
        description: (error as Error).message,
      })
    },

    onSuccess: () => {
      toast.success("Player Registered", {
        description: "The player has been added to the open play.",
      })
    },

    onSettled: (_data, _error) => {
      queryClient.invalidateQueries({ queryKey: qKeyOpenPlays.all, exact: false })
    },

    retry: 1,
  })
}

export function useUpdateOpenPlayPlayer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<OpenPlayPlayerPayload> }) =>
      updateOpenPlayPlayer(id, payload),

    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: ["open-play-player", id] })
      const previousPlayer = queryClient.getQueryData(["open-play-player", id])
      if (previousPlayer) {
        queryClient.setQueryData(["open-play-player", id], {
          ...previousPlayer,
          ...payload,
        })
      }

      return { previousPlayer }
    },

    onError: (error, { id }, context) => {
      if (context?.previousPlayer) {
        queryClient.setQueryData(["open-play-player", id], context.previousPlayer)
      }
      toast.error("Update failed", { description: (error as Error).message })
    },

    onSuccess: () => {
      toast.success("Player updated", { description: "Player details updated successfully" })
    },

    onSettled: (_data, _error) => {
      queryClient.invalidateQueries({ queryKey: qKeyOpenPlays.all, exact: false })
      // queryClient.invalidateQueries({ queryKey: qKeyOpenPlays.organizationActive(_data.), exact: false })
    },

    retry: 1,
  })
}

export function useDeleteOpenPlayPlayer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }: { id: string; openPlayId: string }) => deleteOpenPlayPlayer(id),

    onMutate: async ({ id, openPlayId }) => {
      await queryClient.cancelQueries({ queryKey: ["open-play", openPlayId] })
      const previousOpenPlay = queryClient.getQueryData(["open-play", openPlayId])

      if (previousOpenPlay) {
        queryClient.setQueryData(["open-play", openPlayId], (old: any) => ({
          ...old,
          players: (old.players || []).filter((p: any) => p.id !== id),
        }))
      }

      return { previousOpenPlay }
    },

    onError: (error, { id, openPlayId }, context) => {
      if (context?.previousOpenPlay) {
        queryClient.setQueryData(["open-play", openPlayId], context.previousOpenPlay)
      }
      toast.error("Delete failed", { description: (error as Error).message })
    },

    onSuccess: () => {
      toast.success("Player deleted", {
        description: "Player has been removed from the open play.",
      })
    },

    onSettled: (_data, _error, { openPlayId }) => {
      queryClient.invalidateQueries({ queryKey: qKeyOpenPlays.all, exact: false })
    },

    retry: 1,
  })
}

export function useStatusUpdateOpenPlay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status = OpenPlayStatus.active }: { id: string; status: OpenPlayStatus }) =>
      statusUpdateOpenPlay(id, status),

    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["open-play", id] })

      const previousOpenPlay = queryClient.getQueryData(["open-play", id])

      if (previousOpenPlay) {
        queryClient.setQueryData(["open-play", id], (old: any) => ({
          ...old,
          status: status,
        }))
      }

      return { previousOpenPlay }
    },

    onError: (error, { id }, context) => {
      if (context?.previousOpenPlay) {
        queryClient.setQueryData(["open-play", id], context.previousOpenPlay)
      }
      toast.error("Activation failed", { description: (error as Error).message })
    },

    onSuccess: (_data, variables) => {
      const { status } = variables

      const config: any = {
        [OpenPlayStatus.active]: {
          title: "Open Play Activated",
          description: "The open play status has been updated to active.",
        },
        [OpenPlayStatus.completed]: {
          title: "Open Play Completed",
          description: "The open play has been marked as completed.",
        },
        [OpenPlayStatus.cancelled]: {
          title: "Open Play Cancelled",
          description: "The open play has been cancelled.",
        },
      } as const

      const current = config[status]

      toast.success(current?.title ?? "Status Updated", {
        description: current?.description ?? "The open play status has been updated.",
      })
    },

    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: qKeyOpenPlays.all, exact: false })
    },

    retry: 1,
  })
}

export function useSubmitLineupOpenPlay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ["submit-lineup-open-play"],
    mutationFn: submitLineupOpenPlay,

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["submit-lineup-open-play"] })
      const previousQuery = queryClient.getQueryData(["submit-lineup-open-play"])
      return { previousQuery }
    },

    onError: (error, _values, context) => {
      if (context?.previousQuery) {
        queryClient.setQueryData(["submit-lineup-open-play"], context.previousQuery)
      }
      if (error instanceof Error && "issues" in error) {
        const zodErr = error as any
        toast.error("Validation failed", {
          description: zodErr.issues.map((e: any) => e.message).join(", "),
        })
        return
      }

      toast.error("Submission failed", { description: (error as Error).message })
    },

    onSuccess: () => {
      toast.success("Submission Successful", {
        description: "Your open play lineup has been submitted.",
      })
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qKeyOpenPlays.all, exact: false })
    },

    retry: 1,
  })
}

export function useStartActiveOpenPlay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }: { id: string }) => startActiveOpenPlay(id),

    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["open-play-start", id] })
      const previousOpenPlay = queryClient.getQueryData(["open-play-start", id])

      if (previousOpenPlay) {
        queryClient.setQueryData(["open-play-start", id], (old: any) => ({
          ...old,
          status: status,
        }))
      }

      return { previousOpenPlay }
    },

    onError: (error, { id }, context) => {
      if (context?.previousOpenPlay) {
        queryClient.setQueryData(["open-play-start", id], context.previousOpenPlay)
      }
      toast.error("Starting Open Play failed", { description: (error as Error).message })
    },

    onSuccess: () => {
      toast.success("Open Play Started", {
        description: "The open play has been started.",
      })
    },

    onSettled: (_data, _error) => {
      queryClient.invalidateQueries({ queryKey: qKeyOpenPlays.all, exact: false })
    },

    retry: 1,
  })
}
