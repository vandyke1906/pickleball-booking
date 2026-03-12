"use client"

import BigCalendar from "@/components/big-calendar/big-calendar"
import { useState } from "react"

type Court = {
  id: string
  title: string
}

type CourtEvent = {
  id: string
  title: string
  start: Date
  end: Date
  resourceId: string
}

const courts: Court[] = [
  { id: "court1", title: "Court 1" },
  { id: "court2", title: "Court 2" },
  { id: "court3", title: "Court 3 (VIP)" },
  { id: "court4", title: "Court 4" },
  { id: "court5", title: "Court 5" },
]

export default function Page() {
  const [events, setEvents] = useState<CourtEvent[]>([
    {
      id: "1",
      title: "Morning Pickleball",
      start: new Date("2026-03-01T08:00:00"),
      end: new Date("2026-03-01T09:00:00"),
      resourceId: "court1",
    },
  ])
  const handleSelectSlot = (slotInfo: any) => {
    setEvents([
      ...events,
      {
        id: String(events.length + 1),
        title: "New Booking",
        start: slotInfo.start,
        end: slotInfo.end,
        resourceId: slotInfo.resourceId || "court1", // fallback if none
      },
    ])
  }

  const handleEventDrop = ({ event, start, end, resourceId }: any) => {
    setEvents(events.map((e) => (e.id === event.id ? { ...e, start, end, resourceId } : e)))
  }

  const handleEventResize = ({ event, start, end }: any) => {
    setEvents(events.map((e) => (e.id === event.id ? { ...e, start, end } : e)))
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex-1 min-h-[500px]">
        <BigCalendar
          selectable
          resizable
          draggableAccessor={() => true}
          resizableAccessor={() => true}
          events={events}
          resources={courts}
          onSelectSlot={handleSelectSlot}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          startAccessor="start"
          endAccessor="end"
          defaultView="day"
          style={{ height: "100%" }}
        />
      </div>
    </div>
  )
}
