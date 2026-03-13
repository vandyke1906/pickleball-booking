"use client"

import { CheckCircle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import React from "react"
import { cn } from "@/lib/utils"

interface ConfirmationDialogProps {
  title: string
  description: string
  open: boolean
  setOpen: (open: boolean) => void
  onConfirm?: () => void
  Icon?: React.ReactNode
  variant?: "delete" | "default" | "confirm"
  isLoading?: boolean
}

export default function ConfirmationDialog({
  title,
  description,
  open,
  setOpen,
  onConfirm,
  Icon = <CheckCircle className="text-green-500" size={20} />,
  variant,
  isLoading = false,
}: ConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <div className="flex flex-col gap-2 max-sm:items-center sm:flex-row sm:gap-4">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
            aria-hidden="true"
          >
            {Icon}
          </div>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isLoading}
            onClick={() => {
              if (isLoading) return
              setOpen(false)
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isLoading}
            className={cn({
              "bg-red-600 text-white hover:bg-red-700": variant === "delete",
              "bg-green-600 text-white hover:bg-green-700": variant === "confirm",
            })}
            onClick={() => {
              if (isLoading) return
              onConfirm?.()
              setOpen(false)
            }}
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
