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
import BadgeStatus, { TStatus } from "@/components/common/badge-status"
import { formatFloat, formatISODateString } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import ConfirmationDialog from "@/components/common/confirm-dialog"
import { CheckCircle2, Loader2, X } from "lucide-react"
import { useConfirmBooking, useDeleteBooking } from "@/lib/mutations/booking/booking.mutation"
import { preventDialogCloseProps } from "@/components/dialog/dialog-helper"
import { TBookingDetails } from "@/app/(admin)/admin/(component)/dashboard-admin-page"

interface BookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: TBookingDetails
  onClose?: () => void
}

export function BookingDialog({ open, onOpenChange, booking, onClose }: BookingDialogProps) {
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false)
  const [isDelete, setIsDelete] = useState(false)
  const [acceptBooking, setAcceptBooking] = useState(false)

  const mutation = useConfirmBooking()
  const mutationDelete = useDeleteBooking()

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          onOpenChange(isOpen)
          if (!isOpen && onClose) {
            onClose()
          }
        }}
      >
        <DialogContent {...preventDialogCloseProps}>
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
                {(booking.courts || []).map((c: any, index: number) => {
                  return (
                    <Badge variant="outline" key={index}>
                      {c.name}
                    </Badge>
                  )
                })}
              </p>
            </div>
          </div>

          <DialogFooter>
            {booking.status === "pending" && (
              <>
                <Button
                  variant="success"
                  disabled={mutation.isPending}
                  onClick={() => {
                    setIsDelete(false)
                    setAcceptBooking(true)
                    setOpenConfirmDialog(true)
                  }}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Please wait...
                    </>
                  ) : (
                    "Accept Booking"
                  )}
                </Button>
                <Button
                  variant="destructive"
                  disabled={mutation.isPending}
                  onClick={() => {
                    setIsDelete(false)
                    setAcceptBooking(false)
                    setOpenConfirmDialog(true)
                  }}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Please wait...
                    </>
                  ) : (
                    "Reject Booking"
                  )}
                </Button>
              </>
            )}

            {["cancelled", "reserved"].includes(booking.status) && (
              <Button
                variant="destructive"
                disabled={mutationDelete.isPending}
                onClick={() => {
                  setIsDelete(true)
                  setAcceptBooking(false)
                  setOpenConfirmDialog(true)
                }}
              >
                {mutation.isPending || mutationDelete.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Please wait...
                  </>
                ) : (
                  "Delete Booking"
                )}
              </Button>
            )}

            {booking.status === "confirmed" && (
              <Button
                variant="destructive"
                disabled={mutation.isPending}
                onClick={() => {
                  setIsDelete(false)
                  setAcceptBooking(false)
                  setOpenConfirmDialog(true)
                }}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Please wait...
                  </>
                ) : (
                  "Cancel Booking"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {booking && (
        <ConfirmationDialog
          title="Confirm Booking"
          variant={acceptBooking && !isDelete ? "confirm" : "delete"}
          Icon={
            acceptBooking && !isDelete ? (
              <CheckCircle2 className="text-green-500" size={20} />
            ) : (
              <X className="text-red-500" size={20} />
            )
          }
          description={`Are you sure you want to ${isDelete ? "delete" : acceptBooking ? "accept" : "reject"} booking "${booking.code}"?`}
          open={openConfirmDialog}
          setOpen={setOpenConfirmDialog}
          isLoading={mutation.isPending || mutationDelete.isPending}
          onConfirm={async () => {
            const id: string = booking.id
            if (!id) return
            if (isDelete) {
              mutationDelete.mutate(id, {
                onSuccess: () => {
                  onOpenChange(false)
                  if (onClose) onClose()
                },
              })
            } else {
              mutation.mutate(
                { id, accept: acceptBooking },
                {
                  onSuccess: () => {
                    onOpenChange(false)
                    if (onClose) onClose()
                  },
                },
              )
            }
          }}
        />
      )}
    </>
  )
}
