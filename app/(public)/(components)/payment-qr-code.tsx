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
import { preventDialogCloseProps } from "@/components/dialog/dialog-helper"
import { useOpenWalletApp } from "@/lib/hooks/use-open-wallet-app"

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
  const { openWalletApp, isRedirecting } = useOpenWalletApp()
  const displayAmount =
    amount != null ? amount.toLocaleString("en-PH", { style: "currency", currency }) : null

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  const paymentMethods = [
    {
      image: "/images/payments/gcash-1.jpg",
      description: "GCash Payment",
      children: isMobile && (
        <Button
          type="button"
          variant="default"
          className="w-full"
          disabled={isRedirecting}
          onClick={() => openWalletApp("gcash")}
        >
          {isRedirecting ? "Opening GCash..." : "Open GCash App"}
        </Button>
      ),
    },
    {
      image: "/images/payments/gcash-2.jpg",
      description: "GCash Payment",
      children: isMobile && (
        <Button
          type="button"
          variant="default"
          className="w-full"
          disabled={isRedirecting}
          onClick={() => openWalletApp("gcash")}
        >
          {isRedirecting ? "Opening GCash..." : "Open GCash App"}
        </Button>
      ),
    },
    {
      image: "/images/payments/maya-1.jpg",
      description: "Maya Payment",
      children: isMobile && (
        <Button
          type="button"
          variant="default"
          className="w-full"
          disabled={isRedirecting}
          onClick={() => openWalletApp("maya")}
        >
          {isRedirecting ? "Opening Maya..." : "Open Maya App"}
        </Button>
      ),
    },
  ]

  return (
    <Dialog>
      <DialogTrigger asChild className="w-full">
        <Button variant={buttonVariant} className={className}>
          {triggerText}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md" {...preventDialogCloseProps}>
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
          <DialogDescription>
            Please select any of payment method to pay your booking.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6">
          {displayAmount && (
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Amount to Pay</div>
              <div className="text-2xl font-bold">{displayAmount}</div>
            </div>
          )}

          <div className="p-2 w-full flex flex-col gap-4">
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
