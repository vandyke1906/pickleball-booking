"use client"

import { Calendar, CalendarProps, dateFnsLocalizer } from "react-big-calendar"
import { format, parse, startOfWeek, getDay } from "date-fns"
import { enUS } from "date-fns/locale/en-US"
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop"
import "react-big-calendar/lib/css/react-big-calendar.css"
import "react-big-calendar/lib/addons/dragAndDrop/styles.css"

export type CalendarEvent = {
  title: string
  start: Date
  end: Date
  allDay?: boolean
  variant?: "primary" | "secondary" | "outline"
}

const locales = { "en-US": enUS }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales, })

const DnDCalendar = withDragAndDrop(Calendar) as React.ComponentType<
  CalendarProps<CalendarEvent> & {
    resizable?: boolean
    draggableAccessor?: (event: CalendarEvent) => boolean
    resizableAccessor?: (event: CalendarEvent) => boolean
    onEventDrop?: (args: any) => void
    onEventResize?: (args: any) => void
  }
>

export default function BigCalendar(props: Omit<typeof DnDCalendar extends React.ComponentType<infer P> ? P : never, "localizer">) {
  return <DnDCalendar localizer={localizer} {...props} />
}