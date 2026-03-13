"use client"

import * as React from "react"
import {
  CalendarDays,
  GalleryVerticalEnd,
  LandPlot,
  LayoutDashboard,
  SquareTerminal,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import { useSession } from "next-auth/react"
import Image from "next/image"

const navMain = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: LayoutDashboard,
    isActive: true,
  },
  {
    title: "Management",
    url: "/admin",
    icon: SquareTerminal,
    isActive: true,
    items: [
      {
        icon: CalendarDays,
        title: "Bookings",
        url: "/admin/bookings",
      },
      {
        icon: LandPlot,
        title: "Courts",
        url: "/admin/courts",
      },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()
  const user = {
    name: session?.user?.name || "",
    email: session?.user?.email || "",
    avatar: "/avatars/avatar.jpg",
  }
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  {/* <GalleryVerticalEnd className="size-4 /> */}
                  <Image src="/images/logo.jpg" width={300} height={300} alt="PICKL. Digos Logo" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">PICKL. Digos</span>
                  <span className="">v1.0.0</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
