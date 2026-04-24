"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ButtonProps } from "@base-ui/react"

interface CopyButtonProps extends ButtonProps {
  text?: string
  html?: string
  htmlRef?: React.RefObject<HTMLElement | null>
}

export function CopyButton({ text, html, htmlRef, className }: CopyButtonProps) {
  const [hasCopied, setHasCopied] = React.useState(false)

  React.useEffect(() => {
    if (hasCopied) {
      const timer = setTimeout(() => setHasCopied(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [hasCopied])

  const copyToClipboard = React.useCallback(async () => {
    try {
      const htmlContent = html || htmlRef?.current?.innerHTML || ""
      const textContent = text || htmlRef?.current?.innerText || htmlContent

      if (!textContent && !htmlContent) return

      if (htmlContent && window.ClipboardItem) {
        const data = new ClipboardItem({
          "text/plain": new Blob([textContent], { type: "text/plain" }),
          "text/html": new Blob([htmlContent], { type: "text/html" }),
        })
        await navigator.clipboard.write([data])
      } else {
        await navigator.clipboard.writeText(textContent)
      }
      setHasCopied(true)
    } catch (err) {
      console.error("Copy failed", err)
    }
  }, [text, html, htmlRef])

  return (
    <Button
      variant="ghost"
      size="xs"
      className={cn("h-4 w-4", className)}
      onClick={copyToClipboard}
      aria-label="Copy to clipboard"
    >
      {hasCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </Button>
  )
}
