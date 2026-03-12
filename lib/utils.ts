import { clsx, type ClassValue } from "clsx"
import { addMinutes, parseISO } from "date-fns"
import { toZonedTime, format } from "date-fns-tz"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const DEFAULT_TIMEZONE = "Asia/Manila"

// Convert "HH:mm" string → minutes since midnight
export const toMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

// Convert Date → minutes since midnight
export const toMinutesFromDateTime = (dt: Date): number => {
  return dt.getHours() * 60 + dt.getMinutes()
}

// Parse "yyyy-MM-dd HH:mm:ss" → Date (local)
// export const parseLocalDateTime = (dateTimeStr: string): Date => {
//   return parseISO(dateTimeStr.replace(" ", "T"))
// }

export const getEndTime = (start: string, durationHours: number): string => {
  const [h, m] = start.split(":").map(Number)
  const totalMin = h * 60 + m + durationHours * 60
  const endH = Math.floor(totalMin / 60) % 24
  const endM = totalMin % 60
  return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`
}

/**
 * Build local Date objects from date + time strings
 * @param dateString - "yyyy-MM-dd"
 * @param timeString - "HH:mm"
 * @param durationHours - duration in hours
 * @returns { start: Date, end: Date }
 */
export function makeBookingDate(dateString: string, timeString: string, durationHours: number) {
  const [year, month, day] = dateString.split("-").map(Number)
  const [hour, minute] = timeString.split(":").map(Number)

  // Construct local Date (no UTC conversion)
  const start = new Date(year, month - 1, day, hour, minute)
  const end = addMinutes(start, durationHours * 60)

  return { start, end }
}

export const parseLocalDateTime = (datetime: string): Date => {
  const utc = new Date(datetime + "Z") // Force UTC interpretation
  return new Date(utc.getTime() + 8 * 60 * 60 * 1000) // Shift into local time (Asia/Manila is UTC+8)
}

/**
 * Converts a UTC ISO string to PH time and formats it.
 *
 * @param utcString - UTC datetime string (ISO)
 * @param timeZone  - Optional override (defaults to Asia/Manila)
 * @returns A formatted string like "Mar 14, 2026 · 6:00 AM PHT"
 */
export function formatDateTime(utcString: string, timeZone: string = DEFAULT_TIMEZONE) {
  const zoned = toZonedTime(new Date(utcString), timeZone)
  return zoned
  // const formatted = format(zoned, "MMM dd, yyyy · hh:mm a", { timeZone })
  // return `${formatted} PHT`
}
