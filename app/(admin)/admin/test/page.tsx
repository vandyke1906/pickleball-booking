"use client"

import { Calendar, CalendarProps, dateFnsLocalizer } from "react-big-calendar"
import { format, parse, startOfWeek, getDay } from "date-fns"
import { enUS } from "date-fns/locale"
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

const locales = {
  "en-PH": enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

const DnDCalendar = withDragAndDrop(Calendar) as React.ComponentType<
  CalendarProps<CalendarEvent> & {
    resizable?: boolean
    draggableAccessor?: (event: CalendarEvent) => boolean
    resizableAccessor?: (event: CalendarEvent) => boolean
    onEventDrop?: (args: any) => void
    onEventResize?: (args: any) => void
  }
>

export default function Page() {
  return (
    <div>
      {/* <Calendar
        localizer={localizer}
        // events={myEventsList}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
      /> */}
      <DnDCalendar
        localizer={localizer}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
      />
    </div>
  )
}
