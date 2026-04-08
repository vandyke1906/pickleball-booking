"use client"
import { BokehBackground } from "@/components/animated/background/bokeh-background"
import { PusherProvider } from "@/lib/providers/pusher-provider"
// import { SSEProvider } from "@/lib/providers/server-event-provider"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <PusherProvider>
      <main className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="min-h-screen bg-slate-50 relative">
            <BokehBackground />
            <div className="relative z-10">{children}</div>
          </div>
        </div>
      </main>
    </PusherProvider>
  )
}
