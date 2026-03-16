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

interface PaymentQRDialogProps {
  qrImageSrc: string
  amount?: number
  currency?: string
  reference?: string
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
  const displayAmount =
    amount != null ? amount.toLocaleString("en-PH", { style: "currency", currency }) : null

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  const openGCash = () => {
    const gcashUrl = `gcash://pay?amount=${amount ?? ""}&currency=${currency}&reference=${reference ?? ""}`
    const fallbackUrl = /iPhone|iPad|iPod/i.test(navigator.userAgent)
      ? "https://apps.apple.com/ph/app/gcash/id520020791"
      : "https://play.google.com/store/apps/details?id=com.globe.gcash.android"

    // Try opening GCash
    window.location.href = gcashUrl

    // Fallback after short delay
    setTimeout(() => {
      window.location.href = fallbackUrl
    }, 1500)
  }

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
          {displayAmount && (
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Amount to Pay</div>
              <div className="text-2xl font-bold">{displayAmount}</div>
            </div>
          )}

          <div className="p-4 bg-white rounded-xl shadow-sm border">
            <img
              src={qrImageSrc}
              alt="Payment QR Code"
              width={220}
              height={220}
              className="object-contain"
              loading="lazy"
              decoding="async"
            />
          </div>

          <div className="w-full space-y-3 text-center text-sm">
            <p className="text-muted-foreground leading-relaxed">{paymentInstructions}</p>
          </div>
        </div>

        <DialogFooter className="sm:justify-center flex flex-col gap-2">
          {isMobile && (
            <Button type="button" variant="default" onClick={openGCash}>
              Open in GCash
            </Button>
          )}
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
