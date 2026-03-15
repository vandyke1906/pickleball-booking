"use client"

import { Calendar, CalendarProps, dateFnsLocalizer } from "react-big-calendar"
import { format, parse, startOfWeek, getDay } from "date-fns"
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop"
import { locales } from "@/lib/utils"
import "./big-calendar-style.css"

export type CalendarEvent = {
  title: string
  start: Date
  end: Date
  allDay?: boolean
  variant?: "primary" | "secondary" | "outline"
}

const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

const DnDCalendar = withDragAndDrop(Calendar) as React.ComponentType<
  CalendarProps<CalendarEvent> & {
    resizable?: boolean
    draggableAccessor?: (event: CalendarEvent) => boolean
    resizableAccessor?: (event: CalendarEvent) => boolean
    onEventDrop?: (args: any) => void
    onEventResize?: (args: any) => void
  }
>

export default function BigCalendar(
  props: Omit<typeof DnDCalendar extends React.ComponentType<infer P> ? P : never, "localizer">,
) {
  return <DnDCalendar localizer={localizer} {...props} />
}
