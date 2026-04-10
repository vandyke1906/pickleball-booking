"use client"

import { useState, useEffect } from "react"
import { useOrganizationActiveOpenPlay } from "@/lib/hooks/open-play/open-play.hook"
import { useParams } from "next/navigation"
import { useOrganizationCourts } from "@/lib/hooks/court/court.hook"
import { LoadingScreen } from "@/components/animated/loading-screen"
import { formatDate, formatTimeRange } from "@/lib/utils"
import OpenPlayQueue from "@/app/(public)/[slug]/open-play/(components)/open-play-queue"
import { motion } from "framer-motion"
import { Send } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { preventDialogCloseProps } from "@/components/dialog/dialog-helper"
import { useForm } from "react-hook-form"
import {
  OpenPlayLineupPayload,
  openPlayLineupSchema,
} from "@/lib/validation/open-play/open-play.validation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSubmitLineupOpenPlay } from "@/lib/mutations/open-play/open-play.mutation"

export default function PickleballOpenPlayQueue() {
  const params = useParams()
  const slugParam = params.slug ?? ""
  const slug = Array.isArray(slugParam) ? slugParam[0] : (slugParam ?? "")

  const { data: orgWithCourts, isLoading: isLoadingOrgWithCourts } = useOrganizationCourts({ slug })
  const {
    data: openPlay,
    isLoading,
    isError,
  } = useOrganizationActiveOpenPlay(orgWithCourts?.id ?? "")

  const [currentTime, setCurrentTime] = useState(new Date())
  const [openLineupDialog, setOpenLineupDialog] = useState(false)

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading || isLoadingOrgWithCourts) return <LoadingScreen />

  console.info({ openPlay })

  return (
    <div className="min-h-screen bg-[#092021] text-white font-mono flex flex-col h-screen overflow-hidden">
      {/* HEADER */}
      <header className="bg-black/80 border-b border-emerald-600 py-4 px-4 md:px-8 flex items-center justify-between flex-shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-emerald-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
            <span className="text-black font-black text-4xl">P</span>
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tighter text-white">
              OPEN PLAY QUEUE
            </h1>
            <p className="text-emerald-400 text-base md:text-xl">
              {openPlay?.courts?.length ?? 0} Courts • {openPlay?.transitionMinutes ?? 0} min
              transitions • {openPlay?.startTime ? formatDate(openPlay.startTime) : "No date"} •{" "}
              {formatTimeRange(openPlay?.startTime, openPlay?.endTime)} • Live Session
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <div className="hidden sm:block text-right">
            <div className="text-emerald-300/70 text-sm">
              {`(${formatDate(currentTime)}) -`} <span className="ml-2">CURRENT TIME</span>
            </div>
            <div className="text-4xl md:text-6xl font-bold tabular-nums text-emerald-400">
              {currentTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </div>
          </div>
        </div>
      </header>
      {isError && (
        <div className="min-h-screen flex items-center justify-center text-7xl font-bold uppercase text-white">
          No active open play found.
        </div>
      )}
      {!!openPlay && <OpenPlayQueue data={openPlay} />}
      {/* FOOTER */}
      <footer className="bg-black/80 border-t border-emerald-600 py-4 text-center text-emerald-300/70 text-xl flex-shrink-0">
        Shared {openPlay?.transitionMinutes || ""}-minute transition • 2 or 4 players per group •
        Max 4 players per court
      </footer>
      {/* LINEUP SUBMISSION BUTTON */}
      <motion.button
        onClick={() => {
          setOpenLineupDialog(true)
        }}
        className="fixed bottom-6 right-6 bg-emerald-500 text-black font-bold px-5 py-4 rounded-full shadow-lg hover:bg-emerald-600 transition z-50 flex items-center gap-2"
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        <Send className="w-5 h-5" />
        Submit Lineup
      </motion.button>

      {openPlay && (
        <LineupDialog
          openPlayId={openPlay.id}
          open={openLineupDialog}
          onOpenChange={setOpenLineupDialog}
        />
      )}
    </div>
  )
}

function LineupDialog({
  openPlayId = "",
  open,
  onOpenChange,
}: {
  openPlayId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const mutation = useSubmitLineupOpenPlay()
  const form = useForm<OpenPlayLineupPayload>({
    resolver: zodResolver(openPlayLineupSchema),
    defaultValues: {
      code: "",
      openPlayId,
    },
  })

  const onSubmit = (values: OpenPlayLineupPayload) => {
    mutation.mutate(values, {
      onSuccess: () => {
        onOpenChange(false)
        form.reset({ openPlayId, code: "" })
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent {...preventDialogCloseProps}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <fieldset disabled={mutation.isPending} className="space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Submit Your Lineup</DialogTitle>
              <DialogDescription className="text-muted-foreground leading-relaxed">
                Please input player code issued during registration to complete your lineup
                submission. Make sure to submit before the transition time ends to secure your spot
                in the next game!
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex flex-col gap-2">
                <div className="lg:col-span-2 space-y-2">
                  <Label htmlFor="code" className="font-semibold text-slate-700">
                    Player Code
                  </Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="Enter Player Code"
                    required
                    {...form.register("code")}
                  />
                  {form.formState.errors.code && (
                    <p className="text-sm text-red-600">{form.formState.errors.code.message}</p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="bg-primary font-bold px-5 py-3 rounded-full shadow-lg hover:bg-emerald-800 transition w-full"
              >
                Submit Lineup
              </Button>
            </DialogFooter>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  )
}
