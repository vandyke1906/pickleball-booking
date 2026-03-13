"use client"
import { SSEProvider } from "@/lib/providers/server-event-provider"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <SSEProvider>
      <main className="flex-1 overflow-y-auto">
        <div className="p-4">{children}</div>
      </main>
    </SSEProvider>
  )
}
