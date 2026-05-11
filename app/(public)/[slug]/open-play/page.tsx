"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import { LoadingScreen } from "@/components/animated/loading-screen"
import {
  formatCountdown,
  formatDate,
  formatTimeRange,
  normalizeToPhilippineTimeSeconds,
  PlayerSkillLabels,
  timeText,
  toPhilippineTime,
} from "@/lib/utils"
import { motion } from "framer-motion"
import { Send, Clock, Users, Megaphone, RefreshCw, AlertTriangle } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { EventBusKeys, useEventListener } from "@/lib/client/event-bus"
import AnimatedSVG from "@/components/animated/animated-svg"
import { logoPaths } from "@/lib/svg/logo"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PlayerSkill } from "@/.config/prisma/generated/prisma"

const GUARD_MS = 4000

const groups = []

export default function PickleballOpenPlayQueue() {
  const params = useParams()
  const slugParam = params.slug ?? ""
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam

  const { speak } = useVoice()

  const { data: orgWithCourts, isLoading: isLoadingOrgWithCourts } = useOrganizationCourts({ slug })
  const orgId = orgWithCourts?.id ?? ""
  const {
    data: openPlayData,
    isLoading,
    refetch: refetchOpenPlayData,
    isError,
  } = useActiveOpenPlayQueue(orgId)

  const waitingGroups = openPlayData?.waitingGroups ?? []
  const courts = openPlayData?.courts ?? []

  //Event Listener
  useEventListener(EventBusKeys.OPENPLAY_UPDATED, () => refetchOpenPlayData())

  const isQueueAvailable = !!openPlayData && !isError

  // =====================
  // STATE (ALWAYS STABLE)
  // =====================
  const [currentTime, setCurrentTime] = useState(new Date())
  const [openLineupDialog, setOpenLineupDialog] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [prepRemaining, setPrepRemaining] = useState(0)

  const speechQueueRef = useRef<string[]>([])
  const manualAnnouncedRef = useRef<Set<string>>(new Set())
  const startWarningAnnouncedRef = useRef<Set<string>>(new Set())
  const lastAnnouncedRef = useRef<string | null>(null)
  const lastRefetchRef = useRef<number>(0)
  const hasCancelledRef = useRef(false)
  const speakingRef = useRef(false)

  const processQueue = () => {
    if (!isQueueAvailable) {
      stopSpeaking()
      return
    }

    // ✅ bail if already speaking or queue empty
    if (speakingRef.current) return
    if (speechQueueRef.current.length === 0) return

    const text = speechQueueRef.current.shift()
    if (!text) return

    speakingRef.current = true

    speak(text, 1, 2, (speaking: boolean) => {
      if (!speaking) {
        speakingRef.current = false
        processQueue() // continue with next item only after finishing
      }
    })
  }

  const enqueueSpeak = (text: string) => {
    if (!isQueueAvailable) {
      stopSpeaking()
      return
    }

    // prevent duplicate enqueues
    if (speechQueueRef.current.includes(text)) {
      return
    }

    speechQueueRef.current.push(text)

    if (!speakingRef.current) {
      processQueue()
    }
  }

  const stopSpeaking = () => {
    window.speechSynthesis.cancel()
    speechQueueRef.current = []
    speakingRef.current = false
  }

  // =====================
  // SAFE DATA NORMALIZATION (IMPORTANT FIX)
  // =====================
  const openPlay = openPlayData?.openPlay ?? null

  const nextTransition = openPlayData?.nextTransition
    ? toPhilippineTime(openPlayData?.nextTransition)
    : null

  const nextTransitionRef = useRef(nextTransition)

  useEffect(() => {
    nextTransitionRef.current = nextTransition
  }, [nextTransition])

  // =====================
  // LIVE CLOCK + COUNTDOWN + GAME COMPLETION CHECK
  // =====================
  useEffect(() => {
    const tick = () => {
      const now = toPhilippineTime(new Date())
      setCurrentTime(now)

      if (isQueueAvailable) {
        hasCancelledRef.current = false
        const nextTransitionValue = nextTransitionRef.current
        if (nextTransitionValue) {
          const diff = nextTransitionValue.getTime() - now.getTime()

          setPrepRemaining(diff > 0 ? diff : 0)

          if (diff <= 0) {
            refetchOpenPlayData?.()
            lastRefetchRef.current = nextTransitionValue.getTime()
          }
        }
      } else {
        if (!hasCancelledRef.current) {
          //  Guard: only process if queue is available
          stopSpeaking()
          hasCancelledRef.current = true
        }
      }
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [isQueueAvailable])

  // =====================
  // AUTO ANNOUNCE NEXT GROUPS (multi-court, with lead time)
  // =====================
  useEffect(() => {
    if (!audioEnabled || !openPlayData?.queues?.length || !nextTransition) return

    const leadMinutes = openPlayData.openPlay?.announcementMinutesBeforeTransition ?? 0
    const leadMs = leadMinutes * 60 * 1000

    const now = normalizeToPhilippineTimeSeconds(new Date())
    const last = (window as any).lastAnnounceTime || 0
    const transitionKey = nextTransition.toISOString()

    // ✅ Only announce once per transition slot
    if (lastAnnouncedRef.current === transitionKey) return
    if (now - last < GUARD_MS) return

    // ✅ Trigger announcement when within lead time window
    const transitionTime = normalizeToPhilippineTimeSeconds(nextTransition)
    const diff = transitionTime - now
    if (diff > leadMs) return // too early, wait until within lead window

    // ✅ Find all groups scheduled at the upcoming transition
    const upcomingGroups = openPlayData.queues.filter((q) => {
      const t = normalizeToPhilippineTimeSeconds(q.scheduledAt)
      return Math.abs(t - transitionTime) <= GUARD_MS
    })

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
  }, [audioEnabled, nextTransition, openPlayData?.openPlay?.announcementMinutesBeforeTransition])

  // =====================
  // MANUAL ANNOUNCEMENT (using openPlayData.queues)
  // =====================
  const handleManualAnnouncement = useCallback(() => {
    console.info({ audioEnabled, openPlayData })

    if (!audioEnabled || !openPlayData?.queues || openPlayData.queues.length === 0) return

    const sortedQueues = [...openPlayData.queues].sort(
      (a, b) =>
        normalizeToPhilippineTimeSeconds(a.scheduledAt) -
        normalizeToPhilippineTimeSeconds(b.scheduledAt),
    )

    const firstScheduleTime = normalizeToPhilippineTimeSeconds(sortedQueues[0].scheduledAt)

    // Get all groups with the same earliest schedule
    const nextScheduledGroups = sortedQueues.filter(
      (q) => normalizeToPhilippineTimeSeconds(q.scheduledAt) === firstScheduleTime,
    )

    if (nextScheduledGroups.length === 0) return

    const groupedNames = nextScheduledGroups
      .map((group) => {
        const names = group.players.map((p: any) => p.playerName).join(", ") || "all players"

        return `${names} on ${group.courtName}`
      })
      .join(". ")

    enqueueSpeak(
      `Attention please. Next game at ${timeText(
        nextScheduledGroups[0].scheduledAt,
      )}. Players: ${groupedNames}. Please proceed after the current game.`,
    )
  }, [audioEnabled, openPlayData?.queues])

  if (isLoading || isLoadingOrgWithCourts) return <LoadingScreen message="Loading Queue" />
  if (!isQueueAvailable) return <OpenPlayUnavailable onRetry={refetchOpenPlayData} />

  return (
    <div className="fixed inset-0 h-screen w-screen text-primary font-mono">
      {/* Grid layout: stacked on mobile/tablet, split on large */}
      <div className="grid h-full w-full grid-cols-1 lg:grid-cols-4 overflow-y-auto">
        {/* Sidebar */}
        <aside className="lg:col-span-1 shadow-xl flex flex-col lg:h-full">
          {/* Logo */}
          <div className="py-4 border-b border-white/10 text-center bg-[#092021]">
            <AnimatedSVG paths={logoPaths} viewBox="0 0 1440 514" className="mx-auto w-48 h-auto" />
          </div>

          <div className="border rounded-lg flex flex-col bg-muted gap-2 p-2 lg:h-full">
            {/* Time Range Schedule */}
            <div className="flex items-center justify-between">
              <div className="text-sm">Schedule</div>
              <div className="text-sm font-semibold">{openPlayData.timeRange ?? ""}</div>
            </div>

            {/* Next Schedule */}
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="flex items-center gap-1">
                  Next Schedule
                  <Megaphone
                    onClick={handleManualAnnouncement}
                    className="w-5 h-5 text-emerald-500 cursor-pointer hover:text-emerald-400 transition"
                  />
                </div>
              </div>
              <div className="text-4xl font-bold">
                {nextTransition ? timeText(nextTransition) : "-"}
              </div>
            </div>

            {/* Current Time */}
            <div className="border-b border-white/10 text-center">
              <div className="text-4xl font-black">{timeText(currentTime)}</div>
            </div>

            {/* Join Queue Button */}
            <div className="p-2">
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={() => setOpenLineupDialog(true)}
              >
                Join Queue
              </Button>
            </div>

            {/* Waiting List Title */}
            <div>
              <div className="text-sm text-center uppercase font-bold">Waiting Players</div>
            </div>
            {/* Waiting Groups List */}
            <ScrollArea
              className="
                flex-1 h-0 p-4 border border-gray-500/20 rounded-lg
                min-h-[200px] sm:min-h-[250px] md:min-h-[300px]
              "
            >
              <div className="space-y-3">
                {waitingGroups.map((group: any, idx: number) => (
                  <div
                    key={`group.${group.groupId}_idx.${idx}`}
                    className="
                      rounded-lg border border-dashed border-gray-500/20 px-2
                      md:h-56 lg:h-64
                    "
                  >
                    {/* Desktop Scroll Only */}
                    <div className="hidden md:block h-full">
                      <ScrollArea className="h-full">
                        <GroupContent group={group} />
                      </ScrollArea>
                    </div>

                    {/* Mobile: no inner scroll */}
                    <div className="block md:hidden py-2">
                      <GroupContent group={group} />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-3 bg-[#092021] shadow-xl flex flex-col lg:h-full">
          <div className="py-4 uppercase text-5xl font-bold text-white mb-4 text-center w-full">
            Open Play Dashboard
          </div>
          <div className="flex-1 px-2 pt-2">
            <div
              className="flex-1 rounded-lg grid gap-3 h-full grid-cols-1 lg:grid-cols-none"
              style={{
                gridTemplateColumns:
                  typeof window !== "undefined" && window.innerWidth >= 1024
                    ? `repeat(${courts.length}, 1fr)`
                    : undefined,
              }}
            >
              {courts.map((court: any) => (
                <div
                  key={court.id}
                  className="border border-dashed border-gray-500 rounded-2xl bg-[#C1D5B8] p-4 md:p-6 flex flex-col h-full"
                >
                  {/* Court header */}
                  <div className="flex flex-col items-center justify-center bg-[#7FA477]/60 p-2 md:p-3 rounded-xl mb-4">
                    <div className="text-2xl md:text-4xl font-black text-primary uppercase tracking-tight">
                      {court.name}
                    </div>
                  </div>

                  {/* Current and Next games */}
                  <div className="flex-1 flex flex-col gap-4">
                    {/* Current Game */}
                    <div className="flex-1 flex flex-col">
                      <div className="text-md md:text-2xl font-black uppercase text-primary mb-2 flex items-center justify-center gap-1 tracking-wide">
                        Current Game
                      </div>

                      {court.currentGame ? (
                        <div className="text-xs md:text-sm lg:text-base text-gray-700 mb-2 text-center font-semibold">
                          {timeText(court.currentGame.startTime)} -{" "}
                          {timeText(court.currentGame.estimatedEndTime)}
                        </div>
                      ) : null}

                      <div className="flex-1 overflow-y-auto">
                        {court.currentGame?.players?.length ? (
                          <div className="rounded-xl bg-white/70 p-3 shadow-sm border border-white/40">
                            <div className="flex flex-col gap-2">
                              {court.currentGame.players.map((player) => {
                                const [firstName, ...restNames] = player.playerName.split(" ")
                                return (
                                  <div
                                    key={player.id}
                                    className="flex items-center justify-between"
                                  >
                                    <div className="flex flex-col leading-none min-w-0">
                                      <span className="font-black text-lg md:text-xl lg:text-2xl text-primary uppercase tracking-tight truncate">
                                        {firstName}
                                      </span>
                                      {restNames.length > 0 && (
                                        <span className="text-xs md:text-sm text-primary/80 font-semibold truncate">
                                          {restNames.join(" ")}
                                        </span>
                                      )}
                                    </div>
                                    {player.skill && (
                                      <span className="text-xs md:text-sm font-bold text-primary/70 whitespace-nowrap ml-2">
                                        {PlayerSkillLabels[player.skill as PlayerSkill]}
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-xs md:text-sm text-gray-600 font-medium">
                            No current game
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Next Game */}
                    <div className="flex-1 flex flex-col">
                      <div className="text-md md:text-2xl font-black uppercase text-primary mb-2 flex items-center justify-center gap-1 tracking-wide">
                        Next Game
                      </div>

                      {court.nextGame ? (
                        <div className="text-xs md:text-sm lg:text-base text-gray-700 mb-2 text-center font-semibold">
                          {timeText(court.nextGame.scheduledAt)} -{" "}
                          {timeText(court.nextGame.estimatedEndTime)}
                        </div>
                      ) : null}

                      <div className="flex-1 overflow-y-auto">
                        {court.nextGame?.players?.length ? (
                          <div className="rounded-xl bg-white/70 p-3 shadow-sm border border-white/40">
                            <div className="flex flex-col gap-2">
                              {court.nextGame.players.map((player) => {
                                const [firstName, ...restNames] = player.playerName.split(" ")
                                return (
                                  <div
                                    key={player.id}
                                    className="flex items-center justify-between"
                                  >
                                    <div className="flex flex-col leading-none min-w-0">
                                      <span className="font-black text-lg md:text-xl lg:text-2xl text-primary uppercase tracking-tight truncate">
                                        {firstName}
                                      </span>
                                      {restNames.length > 0 && (
                                        <span className="text-xs md:text-sm text-primary/80 font-semibold truncate">
                                          {restNames.join(" ")}
                                        </span>
                                      )}
                                    </div>
                                    {player.skill && (
                                      <span className="text-xs md:text-sm font-bold text-primary/70 whitespace-nowrap ml-2">
                                        {PlayerSkillLabels[player.skill as PlayerSkill]}
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-xs md:text-sm text-gray-600 font-medium">
                            No next game scheduled
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

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
                Enter your player code to join the queue. Submit before the transition ends!
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
                className="mt-2 uppercase"
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

function OpenPlayUnavailable({
  message = "Open Play is currently unavailable.",
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="min-h-screen bg-[#092021] text-white flex items-center justify-center font-mono px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-black/70 border border-emerald-600/40 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
      >
        {/* ICON */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-emerald-400" />
          </div>
        </div>

        {/* TITLE */}
        <h1 className="text-2xl font-bold text-white mb-2">Open Play Unavailable</h1>

        {/* MESSAGE */}
        <p className="text-emerald-300/70 text-sm mb-6">{message}</p>

        {/* ACTIONS */}
        <div className="flex flex-col gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-3 rounded-xl transition active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

const GroupContent = ({ group }: any) => {
  return (
    <div className="space-y-2">
      {/* Group header with skills badges */}
      <div className="flex flex-wrap gap-2 p-2 items-center justify-center">
        {group.skills.map((skill: PlayerSkill) => (
          <span
            key={skill}
            className="bg-primary/20 text-primary px-2 py-1 rounded-md text-xs font-semibold uppercase"
          >
            {PlayerSkillLabels[skill]}
          </span>
        ))}
      </div>

      {/* Player rows */}
      {group.players.map((player: any, index: number) => {
        const [firstName, ...restNames] = player.playerName.split(" ")

        return (
          <div
            key={`player.${player.id}_idx.${index}`}
            className="flex items-center justify-between py-1 rounded-md"
          >
            {/* Name */}
            <div className="flex flex-col leading-none">
              <span className="font-black text-lg text-primary uppercase">
                {firstName}
              </span>
              {restNames.length > 0 && (
                <span className="text-xs text-primary/80">
                  {restNames.join(" ")}
                </span>
              )}
            </div>

            {/* Status */}
            <div className="text-right text-primary text-xs leading-tight">
              {player.courtName && player.scheduledAt ? (
                <>
                  <Badge>{player.courtName}</Badge>
                  <div>{timeText(player.scheduledAt)}</div>
                </>
              ) : (
                <div className="text-xs uppercase">
                  {PlayerSkillLabels[player.skill as PlayerSkill]}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DebugOverlay({
  openPlayData,
  speechQueueRef,
  isSpeakingRef,
  lastAnnouncedRef,
  startWarningAnnouncedRef,
  manualAnnouncedRef,
}: any) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        right: 0,
        background: "rgba(0,0,0,0.8)",
        color: "white",
        padding: "12px",
        fontSize: "12px",
        maxWidth: "300px",
        zIndex: 9999,
        borderTopLeftRadius: "8px",
      }}
    >
      <h4 style={{ margin: "0 0 8px 0" }}>🔍 Debug Overlay</h4>
      <div>Queue length: {speechQueueRef.current.length}</div>
      <div>Last announced: {lastAnnouncedRef.current}</div>
      <div>Start warnings: {Array.from(startWarningAnnouncedRef.current).join(", ")}</div>
      <div>Manual announced: {Array.from(manualAnnouncedRef.current).join(", ")}</div>
      <div>
        Next scheduled group:{" "}
        {openPlayData?.queue?.[0]
          ? `${openPlayData.queue[0].players.map((p: any) => p.playerName).join(", ")} on ${
              openPlayData.queue[0].courtName
            }`
          : "None"}
      </div>
    </div>
  )
}
