// components/booking-policy-dialog.tsx

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useState } from "react"

interface BookingPolicyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function BookingPolicyDialog({ open, onOpenChange, onConfirm }: BookingPolicyDialogProps) {
  const [isAgreed, setIsAgreed] = useState(false)

  const handleClose = () => {
    setIsAgreed(false)
    onOpenChange(false)
  }

  const handleConfirm = () => {
    if (!isAgreed) return
    onConfirm()
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Booking Policy Agreement</DialogTitle>
          <DialogDescription>
            Please review and accept the policy before proceeding.
          </DialogDescription>
        </DialogHeader>

        <div className="text-sm text-muted-foreground mt-2 space-y-3">
          <ul className="list-disc pl-5 space-y-1">
            <li>No cancellation allowed once booked.</li>
            <li>No refund will be issued.</li>
          </ul>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="agree"
              checked={isAgreed}
              onCheckedChange={(checked) => setIsAgreed(!!checked)}
            />
            <Label htmlFor="agree">I agree to the no cancellation and no refund policy</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>

          <Button onClick={handleConfirm} disabled={!isAgreed}>
            Confirm Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
