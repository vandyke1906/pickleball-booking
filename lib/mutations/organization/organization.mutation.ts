import {
  OrganizationUpdatePayload,
  organizationUpdateSchema,
} from "@/lib/validation/organization/organization.validation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

async function updateOrganization(payload: OrganizationUpdatePayload) {
  const parsed = organizationUpdateSchema.parse(payload)
  const response = await fetch(`/api/organization/${parsed.organizationId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error?.error || "Organization update failed")
  }

  return response.json()
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ["update-organization"],
    mutationFn: updateOrganization,

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["organization"] })
      const previousOrg = queryClient.getQueryData(["organization"])
      return { previousOrg }
    },

    onError: (error, _values, context) => {
      if (context?.previousOrg) {
        queryClient.setQueryData(["organization"], context.previousOrg)
      }
      if (error instanceof Error && "issues" in error) {
        const zodErr = error as any
        toast.error("Validation failed", {
          description: zodErr.issues.map((e: any) => e.message).join(", "),
        })
        return
      }
      toast.error("Organization update failed", { description: (error as Error).message })
    },

    onSuccess: () => {
      toast.success("Organization Updated", {
        description: "Your organization settings have been saved successfully.",
      })
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"], exact: false })
      queryClient.invalidateQueries({ queryKey: ["courts"], exact: false })
    },

    retry: 1,
  })
}
