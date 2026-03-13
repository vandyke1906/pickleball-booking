"use client"

import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import CourtList from "@/app/(admin)/admin/(component)/court-list"
import { useSession } from "next-auth/react"

export default function BookingsPage() {
  const { data: session } = useSession()
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-4">
          <Skeleton className="h-6 w-48" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-6 w-32" />
              </div>
            ))}
          </div>
        </div>
      }
    >
      <CourtList />
    </Suspense>
  )
}
