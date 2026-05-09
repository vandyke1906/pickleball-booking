"use client"

import { useEffect, useState } from "react"
import QRCode from "react-qr-code"
import { QrCode } from "lucide-react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"

interface QrCodePreviewProps {
  title?: string
  value: string
}

export default function QrCodePreview({ value, title }: QrCodePreviewProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open) console.info({ value })
  }, [open])

  return (
    <>
      {/* Trigger Button */}
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
        <QrCode className="h-6 w-6 text-primary" />
      </Button>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{title || "QR Code"}</DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-center py-6">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <QRCode value={value} size={220} className="h-auto w-full max-w-[220px]" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
