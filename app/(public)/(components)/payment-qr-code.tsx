import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Copy, Check } from "lucide-react"
import { formatFloat } from "@/lib/utils"

interface PaymentQRDialogProps {
  qrImageSrc: string // full URL or data URL of the QR code image
  amount?: number // e.g. 1250 or "1,250.00"
  currency?: string // e.g. "PHP"
  reference?: string // booking reference / order ID
  paymentInstructions?: string
  triggerText?: string
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  className?: string
}

export function PaymentQRDialog({
  qrImageSrc,
  amount,
  currency = "PHP",
  paymentInstructions = "Scan the QR code with your mobile banking or e-wallet app to complete payment.",
  triggerText = "Pay with QR",
  buttonVariant = "default",
  className,
}: PaymentQRDialogProps) {
  const displayAmount = amount != null ? formatFloat(amount) : null

  return (
    <Dialog>
      <DialogTrigger asChild className="w-full">
        <Button variant={buttonVariant} className={className}>
          {triggerText}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
          <DialogDescription>Scan the QR code below to pay for your booking.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* Payment Amount (if provided) */}
          {displayAmount && (
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Amount to Pay</div>
              <div className="text-2xl font-bold">{displayAmount}</div>
            </div>
          )}

          {/* QR Code Image */}
          <div className="p-4 bg-white rounded-xl shadow-sm border">
            <img
              src={qrImageSrc}
              alt="Payment QR Code"
              width={220}
              height={220}
              className="object-contain"
              // optional: improve loading experience
              loading="lazy"
              decoding="async"
            />
          </div>

          {/* Reference / Instructions */}
          <div className="w-full space-y-3 text-center text-sm">
            <p className="text-muted-foreground leading-relaxed">{paymentInstructions}</p>
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
