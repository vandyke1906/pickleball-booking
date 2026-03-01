"use client"

import BigCalendar, { CalendarEvent } from "@/components/big-calendar/big-calendar"
import { AppSidebar } from "@/components/blocks/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useState } from "react"

export default function Page() {

  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      title: "Morning Pickleball",
      start: new Date("2026-03-01T08:00:00"),
      end: new Date("2026-03-01T09:00:00"),
    },
  ])

  const handleSelectSlot = (slotInfo: any) => {
    setEvents([
      ...events,
      {
        title: "New Booking",
        start: slotInfo.start,
        end: slotInfo.end,
      },
    ])
  }

  const handleEventDrop = ({ event, start, end }: any) => {
    setEvents(events.map(e => (e === event ? { ...e, start, end } : e)))
  }

  const handleEventResize = ({ event, start, end }: any) => {
    setEvents(events.map(e => (e === event ? { ...e, start, end } : e)))
  }


  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Build Your Application
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <BigCalendar
            selectable
            resizable
            draggableAccessor={() => true}
            resizableAccessor={() => true}
            events={events}
            onSelectSlot={handleSelectSlot}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            startAccessor="start"
            endAccessor="end"
            defaultView="week"
          />
          {/* <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
          </div>
          <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" /> */}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
