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
import { CarouselWrapper } from "@/app/(public)/(components)/payment-carousel"

interface PaymentQRDialogProps {
  amount?: number
  currency?: string
  reference?: string
  paymentInstructions?: string
  triggerText?: string
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  className?: string
}

export function PaymentQRDialog({
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
    const gcashUrl = "gcash://" // Custom scheme to open the app

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    const isAndroid = /Android/i.test(navigator.userAgent)

    const fallbackUrl = isIOS
      ? "https://apps.apple.com/ph/app/gcash/id520020791"
      : "https://play.google.com/store/apps/details?id=com.globe.gcash.android"

    // Only attempt on mobile devices
    if (isIOS || isAndroid) {
      const now = Date.now()

      // Try opening GCash
      window.location.href = gcashUrl

      // If app not installed, redirect to store after ~1.5s
      setTimeout(() => {
        if (Date.now() - now < 2000) {
          window.location.href = fallbackUrl
        }
      }, 1500)
    } else {
      alert("Please use a mobile device to open GCash.")
    }
  }

  const paymentMethods = [
    {
      image: "/images/logo.png",
      description: "GCash Payment",
      children: isMobile && (
        <Button type="button" variant="default" className="w-full" onClick={openGCash}>
          Open in GCash
        </Button>
      ),
    },
    {
      image: "/images/bank-transfer.png",
      description: "Bank Transfer",
    },
  ]

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
          <DialogDescription>
            Please select any of payment method to pay your booking.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {displayAmount && (
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Amount to Pay</div>
              <div className="text-2xl font-bold">{displayAmount}</div>
            </div>
          )}

          <div className="p-4 border flex flex-col gap-4">
            {/* <img
              src={qrImageSrc}
              alt="Payment QR Code"
              width={220}
              height={220}
              className="object-contain"
              loading="lazy"
              decoding="async"
            />

            {isMobile && (
              <Button type="button" variant="default" className="w-full" onClick={openGCash}>
                Open in GCash
              </Button>
            )} */}
            <CarouselWrapper items={paymentMethods} autoPlay interval={2000} />
          </div>

          <div className="w-full space-y-3 text-center text-sm">
            <p className="text-muted-foreground leading-relaxed">{paymentInstructions}</p>
          </div>
        </div>

        <DialogFooter className="sm:justify-center flex flex-col gap-2">
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
