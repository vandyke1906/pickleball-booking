import z from "zod"

export const signInSchema = z.object({
  email: z.email({ error: "Email is required" }),
  password: z.string({ error: "Password is required" }),
})

export type SignInPayload = z.infer<typeof signInSchema>
