"use server"

import { authOptions } from "@/lib/auth"
import { getServerSession } from "next-auth"
import { cache } from "react"

/**
 *Return server session with next auth
 */
export const isServerAuthenticated = cache(async () => {
  const session = await getServerSession(authOptions)
  return session
})
