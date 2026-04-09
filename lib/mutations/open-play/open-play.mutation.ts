import { qKeyOpenPlays } from "@/lib/hooks/open-play/open-play.hook"
import {
  OpenPlayPayload,
  OpenPlayPlayerPayload,
  openPlayPlayerSchema,
  openPlaySchema,
} from "@/lib/validation/open-play/open-play.validation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

async function createOpenPlay(payload: OpenPlayPayload) {
  const parsed = openPlaySchema.parse(payload)

  const formData = new FormData()
  formData.append("date", parsed.date ?? "")
  formData.append("startTime", parsed.startTime)
  formData.append("duration", parsed.duration.toString())
  formData.append("transitionMinutes", parsed.transitionMinutes.toString())
  formData.append("courtIds", JSON.stringify(parsed.courtIds))

  const response = await fetch("/api/open-plays/create", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error?.error || "Open Play failed")
  }

  return response.json()
}

export async function createOpenPlayPlayer(payload: OpenPlayPlayerPayload) {
  const parsed = openPlayPlayerSchema.parse(payload)
  const formData = new FormData()
  formData.append("openPlayId", parsed.openPlayId)
  formData.append("playerName", parsed.playerName)
  formData.append("code", parsed.code ?? "")
  formData.append("contactNumber", parsed.contactNumber ?? "")
  formData.append("emailAddress", parsed.emailAddress ?? "")

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

export function useCreateOpenPlay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ["create-open-play"],
    mutationFn: createOpenPlay,

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

    onSettled: () => {
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
