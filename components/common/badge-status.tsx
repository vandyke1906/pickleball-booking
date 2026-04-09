import { Badge } from "@/components/ui/badge"

export type TStatus =
  | "pending"
  | "confirmed"
  | "reserved"
  | "cancelled"
  | "waiting"
  | "playing"
  | "finished"
  | "active"
  | "completed"

const STATUS_CONFIG: Record<
  TStatus,
  { label: string; variant: "default" | "success" | "warning" | "destructive" }
> = {
  pending: { label: "Pending", variant: "warning" },
  confirmed: { label: "Confirmed", variant: "success" },
  reserved: { label: "Reserved", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },

  waiting: { label: "Waiting", variant: "secondary" as any },
  playing: { label: "Playing", variant: "success" },
  finished: { label: "Finished", variant: "default" },

  active: { label: "Active", variant: "success" },
  completed: { label: "Completed", variant: "default" },
}

export const ReadableStatus = (status: TStatus) => {
  return STATUS_CONFIG[status]?.label ?? "Unknown"
}

export default function BadgeStatus({ status }: { status: TStatus }) {
  const config = STATUS_CONFIG[status]
  return <Badge variant={config?.variant ?? "default"}>{config?.label ?? "Unknown"}</Badge>
}
