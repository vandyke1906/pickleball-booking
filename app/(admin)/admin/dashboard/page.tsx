"use client"

import { Suspense } from "react"
import { CalendarSkeleton } from "@/app/(admin)/admin/(component)/calendar-skeleton"
import DashboardAdminPage from "@/app/(admin)/admin/(component)/dashboard-admin-page"

export default function DashboardPageWrapper() {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <DashboardAdminPage />
    </Suspense>
  )
}
