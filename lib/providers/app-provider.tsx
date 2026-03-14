"use client"

import { SessionProvider } from "next-auth/react"
import QueryProvider from "@/lib/providers/query-provider"
import { Toaster } from "@/components/ui/sonner"
import { NuqsAdapter } from "nuqs/adapters/next/app"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NuqsAdapter>
        <QueryProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </QueryProvider>
      </NuqsAdapter>
    </SessionProvider>
  )
}
