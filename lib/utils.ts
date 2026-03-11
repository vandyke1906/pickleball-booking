import { clsx, type ClassValue } from "clsx"
import { parseISO } from "date-fns"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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
export const parseLocalDateTime = (dateTimeStr: string): Date => {
  return parseISO(dateTimeStr.replace(" ", "T"))
}

export const getEndTime = (start: string, durationHours: number): string => {
  const [h, m] = start.split(":").map(Number)
  const totalMin = h * 60 + m + durationHours * 60
  const endH = Math.floor(totalMin / 60) % 24
  const endM = totalMin % 60
  return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`
}
