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
  triggerText?: string
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  className?: string
}

export function PaymentQRDialog({
  amount,
  currency = "PHP",
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
      image: "/images/payments/gcash-1.png",
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
      image: "/images/payments/gcash-2.png",
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
      image: "/images/payments/maya-1.png",
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
    {
      image: "/images/payments/bdo-1.png",
      description: "BDO Payment",
      children: isMobile && (
        <Button
          type="button"
          variant="default"
          className="w-full"
          disabled={isRedirecting}
          onClick={() => openWalletApp("bdo")}
        >
          {isRedirecting ? "Opening BDO..." : "Open BDO App"}
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
      <DialogContent className="w-[92vw] max-w-sm p-0 sm:p-0 overflow-hidden">
        <div className="p-5 flex flex-col items-center gap-5">
          <DialogHeader>
            <DialogTitle>Payment Options</DialogTitle>
            <DialogDescription>
              Please choose a payment method below to proceed with your booking.
              <br />
              <br />
              <strong>Important:</strong> Completing the payment alone does NOT reserve your slot.
            </DialogDescription>
          </DialogHeader>

          <div className="text-sm text-muted-foreground w-full">
            <ol className="list-decimal pl-5 space-y-1 text-left">
              <li>Take a screenshot or photo of your payment receipt.</li>
              <li>
                Attach it in the <strong>Proof of Payment</strong> section.
              </li>
              <li>
                Click <strong>"Book Now"</strong> to submit your booking.
              </li>
            </ol>

            <p className="mt-3 font-medium text-center">
              Your slot will only be <strong>reserved and confirmed</strong> after completing all
              steps.
            </p>
          </div>

          {displayAmount && (
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Amount to Pay</div>
              <div className="text-2xl font-bold">{displayAmount}</div>
            </div>
          )}

          <div className="w-full max-w-sm mx-auto">
            <CarouselWrapper items={paymentMethods} autoPlay interval={8000} />
          </div>

          <DialogFooter className="w-full px-2">
            <DialogClose asChild>
              <Button variant="secondary" className="w-full">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
