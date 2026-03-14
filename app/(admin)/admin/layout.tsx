"use client"

import { AppSidebar } from "@/components/blocks/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { SessionProvider } from "next-auth/react"
import { SSEProvider } from "@/lib/providers/server-event-provider"
import { Button } from "@/components/ui/button"
import { NotificationsProvider } from "@/lib/providers/notification-provider"
import { Notifications } from "@/app/(admin)/admin/(component)/notifications"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SSEProvider>
        <NotificationsProvider>
          <SidebarProvider>
            <AppSidebar className="relative z-40" />

            <SidebarInset className="flex h-screen flex-col bg-background">
              <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />

                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <div className="ml-auto flex items-center gap-2">
                  <Notifications />
                </div>
              </header>

              {/* scroll container */}
              <main className="flex-1 overflow-y-auto">
                <div className="p-4">{children}</div>
              </main>
            </SidebarInset>
          </SidebarProvider>
        </NotificationsProvider>
      </SSEProvider>
    </SessionProvider>
  )
}
