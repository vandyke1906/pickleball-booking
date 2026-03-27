import { Badge } from "@/components/ui/badge"
import React from "react"

export type TStatus = "pending" | "confirmed" | "reserved" | "cancelled"
export const ReadableStatus = (status: TStatus) => {
  switch (status) {
    case "pending":
      return "Pending"
    case "confirmed":
      return "Confirmed"
    case "reserved":
      return "Reserved"
    case "cancelled":
      return "Cancelled"
    default:
      throw new Error("Status is not define")
  }
}

export default function BadgeStatus({ status }: { status: TStatus }) {
  return (
    <Badge
      variant={
        status === "confirmed"
          ? "success"
          : status === "pending"
            ? "warning"
            : status === "reserved"
              ? "default"
              : "destructive"
      }
    >
      {ReadableStatus(status)}
    </Badge>
  )
}
