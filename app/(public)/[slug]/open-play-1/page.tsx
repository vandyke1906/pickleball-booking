"use client"

import { useOrganizationCourts } from "@/lib/hooks/court/court.hook"
import { useActiveOpenPlayQueue } from "@/lib/hooks/open-play/open-play.hook"
import { formatTimeOnly, formatToPHDateTime, formatToPHMinutes } from "@/lib/utils"
import { useParams } from "next/navigation"

export default function PickleballOpenPlayQueue() {
  const params = useParams()
  const slugParam = params.slug ?? ""
  const slug = Array.isArray(slugParam) ? slugParam[0] : (slugParam ?? "")

  const { data: orgWithCourts, isLoading: isLoadingOrgWithCourts } = useOrganizationCourts({ slug })
  const { data, isLoading } = useActiveOpenPlayQueue(orgWithCourts?.id ?? "")

  if (isLoading || isLoadingOrgWithCourts) return <div>Loading queue...</div>
  if (!data) return <div>No queue data</div>

  console.info({ data })

  return (
    <div>
      <h2>Current Games</h2>
      {data.currentGames.map((g) => (
        <div key={g.courtId} className="mb-4">
          <strong>{g.courtName}</strong> – start at {formatTimeOnly(g.startTime, "hh:mm:ss a")} -
          end at {formatTimeOnly(g.estimatedEndTime, "hh:mm:ss a")}
          <ul className="list-disc list-inside">
            {g.players.map((p) => (
              <li key={p.id}>{p.playerName}</li>
            ))}
          </ul>
        </div>
      ))}
      <h2>Upcoming Queue</h2>
      {data.queue.map((q) => (
        <div key={q.id} className="mb-4">
          <strong>Group {q.position}</strong> – scheduled at {formatToPHDateTime(q.scheduledAt)}
          <ul className="list-disc list-inside">
            {q.players.map((p) => (
              <li key={p.id}>{p.playerName}</li>
            ))}
          </ul>
        </div>
      ))}
      <p>
        {data?.nextTransition && (
          <>
            <strong>Next transition:</strong> {formatToPHDateTime(data.nextTransition!)}
          </>
        )}
      </p>
    </div>
  )
}
