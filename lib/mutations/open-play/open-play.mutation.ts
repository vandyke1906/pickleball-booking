import { qKeyOpenPlays } from "@/lib/hooks/open-play/open-play.hook"
import { OpenPlayPayload, openPlaySchema } from "@/lib/validation/open-play/open-play.validation"
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
