import { clsx, type ClassValue } from "clsx"
import { toZonedTime } from "date-fns-tz"
import { twMerge } from "tailwind-merge"
import { enUS } from "date-fns/locale"
import { addHours, format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const DEFAULT_TIMEZONE = "Asia/Manila"
export const locales = { "en-PH": enUS }

// Convert "HH:mm" string → minutes since midnight
export const toMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

export const getEndTime = (start: string, durationHours: number): string => {
  const [h, m] = start.split(":").map(Number)
  const totalMin = h * 60 + m + durationHours * 60
  const endH = Math.floor(totalMin / 60) % 24
  const endM = totalMin % 60
  return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`
}

export function makeBookingDate(dateString: string, timeString: string, durationHours: number) {
  const [year, month, day] = dateString.split("-").map(Number)
  const [hour, minute] = timeString.split(":").map(Number)

  // Manila is UTC+8 → subtract 8 hours to get UTC
  const startUTC = new Date(Date.UTC(year, month - 1, day, hour - 8, minute))
  const endUTC = addHours(startUTC, durationHours)

  return { start: startUTC, end: endUTC }
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
}

export function formatISODateString(isoString: string) {
  const formatted = format(new Date(isoString), "MMMM dd, yyyy · hh:mm a")
  return formatted
}

/**
 * Formats an ISO/UTC string into a human-readable time string.
 *
 * @param isoString - UTC datetime string (ISO)
 * @param timeZone  - Optional override (defaults to Asia/Manila)
 * @returns A formatted string like "6:00 AM"
 */
export function formatTimeOnly(isoString: string, timeZone: string = DEFAULT_TIMEZONE) {
  const zoned = toZonedTime(new Date(isoString), timeZone)
  return format(zoned, "hh:mm a")
}

export function formatFloat(amount: number | string) {
  if (isNaN(Number(amount))) return amount
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format((amount as number) || 0)
}

export function formatDateAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInSeconds = Math.floor(diffInMs / 1000)
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)
  const diffInWeeks = Math.floor(diffInDays / 7)
  const diffInMonths = Math.floor(diffInDays / 30)
  const diffInYears = Math.floor(diffInDays / 365)

  if (diffInSeconds < 60) {
    return `${diffInSeconds} second${diffInSeconds !== 1 ? "s" : ""} ago`
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`
  } else if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks !== 1 ? "s" : ""} ago`
  } else if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths !== 1 ? "s" : ""} ago`
  } else {
    return `${diffInYears} year${diffInYears !== 1 ? "s" : ""} ago`
  }
}

export const formatDateShort = (dateString: string) => {
  const date = new Date(dateString)
  const month = date.toLocaleString("default", { month: "short" })
  const day = date.getDate()
  return `${month} ${day}`
}

export const formatDateLong = (dateString: string) => {
  const date = new Date(dateString)
  const month = date.toLocaleString("default", { month: "short" })
  const year = date.toLocaleString("default", { year: "numeric" })
  const day = date.getDate()
  return `${month} ${day}, ${year}`
}

export const getMonth = (dateString: string): string => {
  const date = new Date(dateString) // Parse the date string
  const options = { month: "long" } as const // Specify the format for the month name
  return date.toLocaleDateString("en-US", options) // Return the month name in English
}

export function formatDate(
  date: Date | string | number | undefined,
  opts: Intl.DateTimeFormatOptions = {},
) {
  if (!date) return ""

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: opts.month ?? "long",
      day: opts.day ?? "numeric",
      year: opts.year ?? "numeric",
      ...opts,
    }).format(new Date(date))
  } catch {
    return ""
  }
}

export function formatDateString(dateString: string): string {
  // Example usage:
  //console.log(formatDate("2024-12-04")); // Output: December 4 2024

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]
  // Split the input date string
  const [year, month, day] = dateString.split("-")
  // Convert month to zero-based index
  const monthName = months[parseInt(month, 10) - 1]
  // Remove leading zeros from day
  const dayNumber = parseInt(day, 10)
  // Assemble formatted string
  return `${monthName} ${dayNumber}, ${year}`
}

export const getDaysBetween = (start: string, end: string) => {
  const startDate = new Date(start)
  const endDate = end ? new Date(end) : new Date()
  // Normalize to midnight for both dates
  startDate.setHours(0, 0, 0, 0)
  endDate.setHours(0, 0, 0, 0)
  // Calculate diff in milliseconds
  const diffMs = endDate.getTime() - startDate.getTime()
  // Convert ms to days
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

export const getDurationString = (startDateStr: string, endDateStr?: string) => {
  if (!startDateStr) return "-"
  const startDate = new Date(startDateStr)
  const endDate = endDateStr ? new Date(endDateStr) : new Date()

  let years = endDate.getFullYear() - startDate.getFullYear()
  let months = endDate.getMonth() - startDate.getMonth()
  let days = endDate.getDate() - startDate.getDate()

  if (days < 0) {
    // Borrow days from previous month
    months -= 1
    // Get days in previous month
    const prevMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0)
    days += prevMonth.getDate()
  }
  if (months < 0) {
    years -= 1
    months += 12
  }

  const parts = []
  if (years > 0) parts.push(`${years} year${years > 1 ? "s" : ""}`)
  if (months > 0) parts.push(`${months} month${months > 1 ? "s" : ""}`)
  if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`)
  if (parts.length === 0) parts.push("0 days")
  return parts.join(", ")
}

export function formatToPHTime(isoString?: string) {
  if (!isoString) return "—"
  const formatter = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  })
  return formatter.format(new Date(isoString))
}

export function formatHour(hour: number): string {
  if (hour === 24) return "00:00" // midnight next day
  return `${hour.toString().padStart(2, "0")}:00`
}

export function formatLabel(hour: number): string {
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  const suffix = hour < 12 || hour === 24 ? "AM" : "PM"
  return `${hour12.toString().padStart(2, "0")}:00 ${suffix}`
}

//for building queries server
export function normalizeOpeningHours(hours: { startHour: number; endHour: number }[]) {
  // Sort ascending for consistency
  const sorted = [...hours].sort((a, b) => a.startHour - b.startHour)

  const normalized: { startHour: number; endHour: number }[] = []

  for (const current of sorted) {
    const prev = normalized[normalized.length - 1]

    // Merge continuation: prev ends at midnight (24) and current starts at 0
    if (prev && prev.endHour === 24 && current.startHour === 0) {
      prev.endHour = 24 + current.endHour // extend into next day
    } else {
      normalized.push({ ...current })
    }
  }

  // Extra check: if we have [0–X] and [Y–24], merge them into [Y–24+X]
  if (normalized.length === 2 && normalized[0].startHour === 0 && normalized[1].endHour === 24) {
    normalized[1].endHour = 24 + normalized[0].endHour
    return [normalized[1]]
  }

  return normalized
}
//building queries on server
export function buildDateRanges(
  dateParam: string,
  hours: { startHour: number; endHour: number }[],
) {
  return hours.map((h) => {
    const start = new Date(`${dateParam}T00:00:00+08:00`)
    start.setHours(h.startHour, 0, 0, 0)

    const end = new Date(`${dateParam}T00:00:00+08:00`)
    end.setHours(h.endHour % 24, 0, 0, 0)

    if (h.endHour > 24) {
      end.setDate(end.getDate() + 1) // push to next day
    }

    return { start, end }
  })
}

//for building timing on client
export function normalizeOpeningHoursClient(hours: { startHour: number; endHour: number }[]) {
  const sorted = [...hours].sort((a, b) => a.startHour - b.startHour)
  const normalized: { startHour: number; endHour: number }[] = []

  for (const current of sorted) {
    const prev = normalized[normalized.length - 1]
    if (prev && prev.endHour === 24 && current.startHour === 0) {
      prev.endHour = 24 + current.endHour // extend into next day
    } else {
      normalized.push({ ...current })
    }
  }

  // Special case: [0–X] and [Y–24] → merge into [Y–24+X]
  if (normalized.length === 2 && normalized[0].startHour === 0 && normalized[1].endHour === 24) {
    normalized[1].endHour = 24 + normalized[0].endHour
    return [normalized[1]]
  }

  return normalized
}

export function calculateDuration(
  selected: string, // e.g. "09:00"
  hours: { startHour: number; endHour: number }[],
) {
  // Normalize first
  const normalized = normalizeOpeningHoursClient(hours)

  // Parse selected hour
  const [hStr] = selected.split(":")
  const selectedHour = parseInt(hStr, 10)

  // Find the block containing the selected hour
  const block = normalized.find((h) => selectedHour >= h.startHour && selectedHour < h.endHour)

  if (!block) return 0

  // Duration in hours
  return block.endHour - selectedHour
}
