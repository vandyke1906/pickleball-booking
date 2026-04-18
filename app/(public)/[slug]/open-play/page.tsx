"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import { LoadingScreen } from "@/components/animated/loading-screen"
import { formatCountdown, formatDate, formatTimeRange, timeText } from "@/lib/utils"
import { motion } from "framer-motion"
import { Send, Clock, Users, Megaphone } from "lucide-react"
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
import { useOrganizationCourts } from "@/lib/hooks/court/court.hook"
import { useActiveOpenPlayQueue } from "@/lib/hooks/open-play/open-play.hook"
import { useVoice } from "@/lib/hooks/speech/use-voice"

type OpenPlayData = {
  openPlay: {
    id: string
    startedAt: string
    startTime: string
    endTime: string
    transitionMinutes: number
    preparationSeconds: number
    courts: Array<{ id: string; name: string }>
    // ... other fields
  }
  currentGames: Array<{
    courtId: string
    courtName: string
    players: Array<{ id: string; playerName: string }>
    startTime: string
    estimatedEndTime: string
    isPreparing: boolean
  }>
  queue: Array<{
    id: string
    players: Array<{ id: string; playerName: string }>
    scheduledAt: string
    position: number
  }>
  completedGames: any[]
  nextTransition: string
}

export default function PickleballOpenPlayQueue() {
  const params = useParams()
  const slugParam = params.slug ?? ""
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam

  const { speak } = useVoice()

  const { data: orgWithCourts, isLoading: isLoadingOrgWithCourts } = useOrganizationCourts({ slug })
  const orgId = orgWithCourts?.id ?? ""
  const { data: openPlayData, isLoading } = useActiveOpenPlayQueue(orgId)

  // =====================
  // STATE (ALWAYS STABLE)
  // =====================
  const [currentTime, setCurrentTime] = useState(new Date())
  const [openLineupDialog, setOpenLineupDialog] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [prepRemaining, setPrepRemaining] = useState(0)

  const isSpeakingRef = useRef(false)
  const speechQueueRef = useRef<string[]>([])
  const prevDiffRef = useRef<number>(Infinity)

  const processQueue = () => {
    if (isSpeakingRef.current) return
    if (speechQueueRef.current.length === 0) return

    const text = speechQueueRef.current.shift()
    if (!text) return

    isSpeakingRef.current = true

    speak(text, 1, 2, (speaking: boolean) => {
      if (!speaking) {
        isSpeakingRef.current = false
        processQueue()
      }
    })
  }

  const enqueueSpeak = (text: string) => {
    speechQueueRef.current.push(text)
    processQueue()
  }

  const readySoonAnnouncedRef = useRef(false)
  const startWarningAnnouncedRef = useRef<Set<string>>(new Set())
  const lastAnnouncedRef = useRef<string | null>(null)

  // =====================
  // SAFE DATA NORMALIZATION (IMPORTANT FIX)
  // =====================
  const openPlay = openPlayData?.openPlay ?? null
  const queue = openPlayData?.queue ?? []
  const currentGames = openPlayData?.currentGames ?? []
  const nextTransition = openPlayData?.nextTransition ?? null

  const nextGroups = queue.filter(
    (q) =>
      nextTransition && new Date(q.scheduledAt).getTime() === new Date(nextTransition).getTime(),
  )

  // =====================
  // LIVE CLOCK
  // =====================
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // =====================
  // COUNTDOWN
  // =====================
  useEffect(() => {
    if (!nextTransition) return

    const update = () => {
      const diff = new Date(nextTransition).getTime() - Date.now()
      setPrepRemaining(diff > 0 ? diff : 0)
    }

    update()
    const interval = setInterval(update, 1000)

    return () => clearInterval(interval)
  }, [nextTransition])

  const formatCountdown = (ms: number) => {
    const sec = Math.floor(ms / 1000)
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  // =====================
  // AUTO ANNOUNCE NEXT GROUPS (multi-court)
  // =====================
  useEffect(() => {
    if (!audioEnabled || !queue || queue.length === 0) return
    if (!nextTransition) return

    const now = Date.now()
    const last = (window as any).lastAnnounceTime || 0

    // Normalize nextTransition to string key
    const transitionKey = new Date(nextTransition).toISOString()

    // Only announce once per transition slot, throttle to avoid repeats
    if (lastAnnouncedRef.current === transitionKey && now - last < 40000) return

    // Find all groups scheduled at the upcoming transition
    const upcomingGroups = queue.filter(
      (q) => new Date(q.scheduledAt).getTime() === new Date(nextTransition).getTime(),
    )

    if (!upcomingGroups.length) return

    const groupedMessage = upcomingGroups
      .map((group) => {
        const names = group.players.map((p: any) => p.playerName).join(", ") || "all players"
        return `${names} on ${group.courtName}`
      })
      .join(". ")

    enqueueSpeak(`Attention please. Next players: ${groupedMessage}.`)
    lastAnnouncedRef.current = transitionKey
    ;(window as any).lastAnnounceTime = now
  }, [queue, nextTransition, audioEnabled])

  // =====================
  // READY SOON (fixed)
  // =====================
  useEffect(() => {
    if (!audioEnabled || !nextGroups.length || !openPlay?.preparationSeconds || !prepRemaining)
      return

    // Convert preparationSeconds → ms
    const PREPARATION_MS = openPlay.preparationSeconds * 1000

    // Only trigger when within the preparation window
    if (prepRemaining > PREPARATION_MS) {
      readySoonAnnouncedRef.current = false
      return
    }

    if (readySoonAnnouncedRef.current) return

    //Guard: skip if current time is already past the scheduled start
    const now = Date.now()
    const scheduledTime = new Date(nextGroups[0].scheduledAt).getTime()
    if (now >= scheduledTime) return

    // Compute remaining time in minutes + seconds
    const totalSeconds = Math.floor(prepRemaining / 1000)
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60

    let msg = ""
    if (mins > 0) msg += `${mins} minute${mins !== 1 ? "s" : ""}`
    if (secs > 0) {
      if (msg) msg += " and "
      msg += `${secs} second${secs !== 1 ? "s" : ""}`
    }

    if (!msg) msg = "less than a second" // ✅ fallback if msg is empty
    enqueueSpeak(`Ready in ${msg}. Please prepare.`)

    readySoonAnnouncedRef.current = true
  }, [openPlay, nextGroups, prepRemaining, audioEnabled])

  // =====================
  // START WARNING (using nextGroups)
  // =====================
  useEffect(() => {
    if (!audioEnabled || !openPlay?.announcementMinutesBeforeTransition) return
    if (!nextTransition || !nextGroups || nextGroups.length === 0) return

    const warningMs = openPlay.announcementMinutesBeforeTransition * 60_000
    const diff = new Date(nextTransition).getTime() - Date.now()

    // Reset if we're still outside the window
    if (diff > warningMs) {
      startWarningAnnouncedRef.current.clear()
      prevDiffRef.current = diff
      return
    }

    // Only trigger when crossing into the window
    if (prevDiffRef.current > warningMs && diff <= warningMs) {
      nextGroups.forEach((group) => {
        const key = `warn-${group.id}-${new Date(nextTransition).toISOString()}`
        if (startWarningAnnouncedRef.current.has(key)) return

        const names = group.players.map((p: any) => p.playerName).join(", ") || "all players"
        const groupedNames = `${names} on ${group.courtName}`

        const scheduledTime = new Date(group.scheduledAt).getTime()
        const now = Date.now()
        if (now >= scheduledTime + 20000) return
        enqueueSpeak(
          `Attention please. Next game at ${timeText(
            group.scheduledAt,
          )}. Players: ${groupedNames}. Please prepare and proceed after the current game.`,
        )

        startWarningAnnouncedRef.current.add(key)
      })
    }

    prevDiffRef.current = diff
  }, [nextTransition, audioEnabled, nextGroups, openPlay])

  // =====================
  // MANUAL ANNOUNCEMENT (nextGroups)
  // =====================
  const handleManualAnnouncement = useCallback(() => {
    console.info({ audioEnabled, queue })
    if (!audioEnabled || !queue || queue.length === 0) return

    // Find the earliest upcoming scheduled time
    const soonestTime = Math.min(...queue.map((q) => new Date(q.scheduledAt).getTime()))
    const now = Date.now()

    // ✅ Skip if already past scheduled start
    if (now >= soonestTime) return

    // Get all groups scheduled at that earliest time (multi-court support)
    const upcomingGroups = queue.filter((q) => new Date(q.scheduledAt).getTime() === soonestTime)

    upcomingGroups.forEach((group) => {
      const names = group.players.map((p: any) => p.playerName).join(", ") || "all players"
      const groupedNames = `${names} on ${group.courtName}`

      enqueueSpeak(
        `Attention please. Next game at ${timeText(
          group.scheduledAt,
        )}. Players: ${groupedNames}. Please proceed after the current game.`,
      )
    })
  }, [audioEnabled, queue])

  if (isLoading || isLoadingOrgWithCourts) return <div>Loading queue...</div>

  if (!openPlayData) return <LoadingScreen />

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
              {openPlay?.courts.length} Courts • {openPlay?.transitionMinutes} minutes transitions •{" "}
              {formatDate(openPlay?.startTime)} •{" "}
              {formatTimeRange(openPlay?.startTime, openPlay?.endTime)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <div className="hidden sm:block text-right">
            <div className="text-emerald-300/70 text-sm">CURRENT TIME</div>
            <div className="text-4xl md:text-6xl font-bold tabular-nums text-emerald-400">
              {timeText(currentTime)}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6 space-y-8">
        {/* NEXT TRANSITION */}
        <div className="bg-black/60 border border-emerald-600/50 rounded-2xl p-6">
          <div className="flex items-center gap-3 text-emerald-400 mb-2">
            <Clock className="w-6 h-6" />
            <span className="uppercase tracking-widest text-sm font-semibold">Next Transition</span>
            <Megaphone
              onClick={handleManualAnnouncement}
              className="w-8 h-8 text-emerald-500 cursor-pointer hover:text-emerald-400 transition"
            />
          </div>

          <div className="text-5xl font-bold tabular-nums text-white">
            {nextTransition && timeText(nextTransition)}
          </div>

          {/* ✅ NEW: countdown */}
          <div className="mt-3 text-emerald-400 text-3xl font-bold">
            {formatCountdown(prepRemaining)}
          </div>

          <p className="text-emerald-300/70 mt-1">
            {openPlay?.transitionMinutes} minutes transition • {openPlay?.preparationSeconds}{" "}
            seconds player switch
          </p>
        </div>

        {/* CURRENT GAMES */}
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            CURRENT GAMES
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {currentGames.map((game, index) => (
              <div
                key={game.courtId}
                className="bg-black/70 border border-emerald-600/30 rounded-2xl p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-emerald-400 font-semibold text-xl">{game.courtName}</div>
                    <div className="text-sm text-emerald-300/60">
                      Started {timeText(game.startTime)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-widest text-emerald-300/70">
                      Ends ~
                    </div>
                    <div className="text-lg font-mono text-emerald-400">
                      {timeText(game.estimatedEndTime)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {game.players.map((player, i) => (
                    <div
                      key={player.id}
                      className="bg-zinc-900/80 px-4 py-3 rounded-xl text-sm border border-emerald-900/50"
                    >
                      {player.playerName}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* WAITING QUEUE */}
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span>WAITING QUEUE</span>
            <span className="text-emerald-400 text-base">({queue.length} groups)</span>
          </h2>

          {queue.length === 0 ? (
            <div className="text-center py-12 text-emerald-300/60">No groups waiting</div>
          ) : (
            <div className="space-y-4">
              {queue.map((group) => (
                <div
                  key={group.id}
                  className="bg-black/60 border border-emerald-600/30 rounded-2xl p-6 flex justify-between items-center"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold">
                      {group.position}
                    </div>
                    <div>
                      <div className="text-white font-medium">Group {group.position}</div>
                      <div className="text-emerald-300/70 text-sm">
                        Scheduled: {timeText(group.scheduledAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {group.players.map((player) => (
                      <div
                        key={player.id}
                        className="bg-zinc-900 px-4 py-2 rounded-xl text-sm border border-emerald-900/50"
                      >
                        {player.playerName}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-black/80 border-t border-emerald-600 py-4 px-6 text-center text-emerald-300/70 text-lg flex-shrink-0">
        {openPlay?.transitionMinutes}-minute transition • Max 4 players per court
      </footer>

      {/* SUBMIT LINEUP BUTTON */}
      <motion.button
        onClick={() => setOpenLineupDialog(true)}
        className="fixed bottom-8 right-8 bg-emerald-500 hover:bg-emerald-600 text-black font-bold px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 z-50 transition-all active:scale-95"
        initial={{ opacity: 0, scale: 0.8, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        <Send className="w-5 h-5" />
        Submit Lineup
      </motion.button>

      {openPlay && (
        <LineupDialog
          openPlayId={openPlay.id!}
          open={openLineupDialog}
          onOpenChange={setOpenLineupDialog}
        />
      )}
    </div>
  )
}

// Keep your LineupDialog component unchanged (it's already good)
function LineupDialog({
  openPlayId,
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
    defaultValues: { code: "", openPlayId },
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
              <DialogDescription className="text-muted-foreground">
                Enter your player code to join the queue or confirm your next game. Submit before
                the transition ends!
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Label htmlFor="code" className="font-semibold text-slate-700">
                Player Code
              </Label>
              <Input
                id="code"
                type="text"
                placeholder="Enter Player Code"
                {...form.register("code")}
                className="mt-2"
              />
              {form.formState.errors.code && (
                <p className="text-red-600 text-sm mt-1">{form.formState.errors.code.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 py-6 text-lg font-bold"
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
