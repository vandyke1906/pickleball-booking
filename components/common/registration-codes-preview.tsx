"use client"

import { useState } from "react"
import { Binary, Search } from "lucide-react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CopyButton } from "@/components/common/copy-button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"

interface RegistrationCodePreviewProps {
  title?: string
  codes: string[]
}

export default function RegistrationCodePreview({ codes, title }: RegistrationCodePreviewProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filteredCodes = codes.filter((code) => code.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      {/* Trigger Button with Tooltip */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
              <Binary className="h-6 w-6 text-primary" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>View registration codes</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>{title || "Registration Codes"}</DialogTitle>
          </DialogHeader>

          {/* Search Input */}
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
              type="search"
            />
          </div>

          {/* Scrollable List */}
          <ScrollArea className="h-[400px] w-full rounded-md border p-4">
            {filteredCodes.length > 0 ? (
              <ul className="space-y-2">
                {filteredCodes.map((code) => (
                  <li
                    key={code}
                    className="flex items-center justify-between rounded-md border bg-white px-3 py-2 shadow-sm"
                  >
                    <span className="text-2xl font-bold text-primary">{code}</span>
                    <CopyButton text={code} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No codes found</p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
