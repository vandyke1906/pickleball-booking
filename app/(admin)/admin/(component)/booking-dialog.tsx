"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { TBookingDetails } from "@/app/(admin)/admin/page"
import BadgeStatus, { TStatus } from "@/components/common/badge-status"
import { formatFloat, formatISODateString } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface BookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: TBookingDetails
}

export function BookingDialog({ open, onOpenChange, booking }: BookingDialogProps) {
  console.info({ booking })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Booking Details</DialogTitle>
          <DialogDescription>Review the details of this booking.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">Booking Code</p>
            <p className="text-muted-foreground font-bold">{booking.code}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Booked By</p>
            <p className="text-sm text-muted-foreground">{booking.bookedBy}</p>
          </div>

          <div>
            <p className="text-sm font-medium">Contact Details</p>
            {(booking.contactNumber || booking.emailAddress) && (
              <p className="text-sm text-muted-foreground">
                {booking.contactNumber && <span>{booking.contactNumber}</span>}
                {booking.contactNumber && booking.emailAddress && <span> | </span>}
                {booking.emailAddress && <span>{booking.emailAddress}</span>}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm font-medium">Status</p>
            <BadgeStatus status={booking.status as TStatus} />
          </div>

          {booking.proofOfPayment && (
            <div>
              <p className="text-sm font-medium">Proof of Payment</p>
              <a
                href={booking.proofOfPayment}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                View Proof
              </a>
            </div>
          )}

          <div>
            <p className="text-sm font-medium">Total Price</p>
            <p className="text-sm text-muted-foreground">{formatFloat(booking.totalPrice)}</p>
          </div>

          <div>
            <p className="text-sm font-medium">Start</p>
            <p className="text-sm text-muted-foreground">{formatISODateString(booking.start)}</p>
          </div>

          <div>
            <p className="text-sm font-medium">End</p>
            <p className="text-sm text-muted-foreground">{formatISODateString(booking.end)}</p>
          </div>

          <div>
            <p className="text-sm font-medium">Courts</p>
            <p className="text-sm text-muted-foreground">
              {(booking.courts || []).map((c: any) => {
                console.info({ c })
                return (
                  <Badge variant="outline" key={c.id}>
                    {c.name} - {formatFloat(c.price)}
                  </Badge>
                )
              })}
            </p>
          </div>
        </div>

        <DialogFooter>
          {booking.status === "pending" && (
            <Button variant="success" onClick={() => onOpenChange(false)}>
              Confirm Booking
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
