import { signIn, useSession } from "next-auth/react"
import { SignInPayload, signInSchema } from "@/lib/validation/auth/auth.validation"
import { toast } from "sonner"
import { useMutation } from "@tanstack/react-query"

async function signInAccount(payload: SignInPayload) {
  const parsed = signInSchema.safeParse(payload)
  if (!parsed.success) throw new Error("Please check your email and password")

  const { email, password } = parsed.data
  const result = await signIn("credentials", {
    redirect: false,
    email: email,
    password,
  })

  if (result?.error) {
    let message = ""
    switch (result.error) {
      case "CredentialsSignin":
        message = "Invalid credentials."
        break
      default:
        message = "Failed to sign in"
        break
    }
    throw new Error(message)
  }
  return result
}

export function useSignin() {
  const { update } = useSession()
  return useMutation({
    mutationKey: ["signin"],
    mutationFn: signInAccount,

    onMutate: async () => {},

    onError: (error, _values) => {
      if (error instanceof Error && "issues" in error) {
        const zodErr = error as any
        toast.error("Validation failed", {
          description: zodErr.issues.map((e: any) => e.message).join(", "),
        })
        return
      }

      toast.error("Sign in Failed", { description: (error as Error).message })
    },

    onSuccess: async () => {
      await update()
      toast.success("Sign In", {
        description: "Signed in successfully!",
      })
    },

    onSettled: () => {},
    retry: 1,
  })
}
