"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import { LoadingScreen } from "@/components/animated/loading-screen"
import {
  normalizeToPhilippineTimeSeconds,
  PlayerSkillLabels,
  timeText,
  toPhilippineTime,
} from "@/lib/utils"
import { motion } from "framer-motion"
import { Megaphone, RefreshCw, AlertTriangle, WifiOff } from "lucide-react"
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
import {
  useCompleteOpenPlay,
  useSubmitLineupOpenPlay,
} from "@/lib/mutations/open-play/open-play.mutation"
import { useOrganizationCourts } from "@/lib/hooks/court/court.hook"
import { useActiveOpenPlayQueue } from "@/lib/hooks/open-play/open-play.hook"
import { Badge } from "@/components/ui/badge"
import { EventBusKeys, useEventListener } from "@/lib/client/event-bus"
import AnimatedSVG from "@/components/animated/animated-svg"
import { logoPaths } from "@/lib/svg/logo"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PlayerSkill } from "@/.config/prisma/generated/prisma"
import { useSpeech } from "@/lib/hooks/speech/use-speech"
import { QUEUE_KEYS } from "@/lib/type/queue/queue.type"
import { useNetworkStatus } from "@/lib/hooks/court/network/use-network.hook"

type Announcement = {
  key: string
  text: string
  preparationAt?: string
}

const GUARD_MS = 5000

export default function PickleballOpenPlayQueue() {
  const params = useParams()
  const slugParam = params.slug ?? ""
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam

  const completeOpenPlayMutation = useCompleteOpenPlay()
  const { isOnline, isOffline, isSlow, quality } = useNetworkStatus()

  const { data: orgWithCourts, isLoading: isLoadingOrgWithCourts } = useOrganizationCourts({ slug })
  const orgId = orgWithCourts?.id ?? ""
  const {
    data: openPlayData,
    isLoading,
    refetch: refetchOpenPlayData,
    isError,
  } = useActiveOpenPlayQueue(orgId)

  useEventListener(EventBusKeys.OPENPLAY_UPDATED, async ({ data }) => {
    setTimeout(() => {
      refetchOpenPlayData()
    }, 1000) // 1 second delay

    if (data?.key === QUEUE_KEYS.MATCH_ANNOUNCEMENT) {
      const key = [data.courtName, ...data.players].join("|")
      const text = `Attention... Next on ${data.courtName}.. Players, ${data.players.join(", ")}.`

      const alreadyExists = announcementsRef.current.some((a) => a.key === key)
      if (data?.courtName && data.players?.length && !alreadyExists) {
        const announcement: Announcement = {
          key,
          text,
          preparationAt: data.preparationAt,
        }

        announcementsRef.current.push(announcement)

        const prepTime = toPhilippineTime(new Date(data.preparationAt)).getTime()
        const now = currentTime.getTime()
        const delay = prepTime - now

        // console.info({ delay, announcement })

        if (delay <= 0) {
          // preparationAt is now or already passed → announce immediately
          enqueueSpeak(text, 2, 0.5, () => {
            // remove after speaking
            announcementsRef.current = announcementsRef.current.filter(
              (a) => a.key !== announcement.key,
            )
          })
        } else {
          // preparationAt is in the future → schedule
          setTimeout(() => {
            enqueueSpeak(text, 2, 0.5, () => {
              announcementsRef.current = announcementsRef.current.filter(
                (a) => a.key !== announcement.key,
              )
              setTimeout(() => {
                refetchOpenPlayData()
              }, 2000) // 1 second delay
            })
          }, delay)
        }
      }
    }
    // if (data?.key === QUEUE_KEYS.MATCH_ANNOUNCEMENT) {
    //   const key = [data.courtName, ...data.players].join("|")
    //   const text = `Attention... Next on ${data.courtName}.. Players, ${data.players.join(", ")}.`
    //   if (data?.courtName && data.players?.length && !announcedKeysRef.current.has(key)) {
    //     announcedKeysRef.current.add(key)
    //     announcementsRef.current.push(text)
    //     enqueueSpeak(text, 2, 0.5)
    //   }
    // }
  }) //Event Listener

  const waitingGroups = openPlayData?.waitingGroups ?? []
  const courts = openPlayData?.courts ?? []
  const isQueueAvailable = !!openPlayData && !isError

  // =====================
  // STATE
  // =====================
  const [currentTime, setCurrentTime] = useState(toPhilippineTime(new Date()))
  const [openLineupDialog, setOpenLineupDialog] = useState(false)
  const [prepRemaining, setPrepRemaining] = useState(0)

  const lastAnnouncedRef = useRef<string | null>(null)
  const lastRefetchRef = useRef<number>(0)
  const hasCancelledRef = useRef(false)
  const hasAutoEndedRef = useRef(false)
  const nextTransitionRef = useRef<Date | null>(null)

  // Track unique announcements
  const announcementsRef = useRef<Announcement[]>([])

  const { enqueueSpeak, stopSpeaking } = useSpeech(isQueueAvailable)

  const openPlay = openPlayData?.openPlay ?? null
  const nextTransition = openPlayData?.nextTransition
    ? toPhilippineTime(openPlayData.nextTransition)
    : null

  useEffect(() => {
    nextTransitionRef.current = nextTransition
  }, [nextTransition])

  // =====================
  // MANUAL ANNOUNCE (current + next queue)
  // =====================
  const handleManualAnnouncement = useCallback(() => {
    if (!openPlayData?.courts?.length) return

    const messages: string[] = []

    openPlayData.courts.forEach((court) => {
      // ✅ Current game announcement
      if (court.currentGame?.players?.length) {
        const names =
          court.currentGame.players.map((p: any) => p.playerName).join(", ") || "all players"
        messages.push(`${court.name}.. Currently playing: ${names}.`)
      }

      // ✅ Next queue announcement (preparation)
      if (court.nextGame?.players?.length) {
        const names =
          court.nextGame.players.map((p: any) => p.playerName).join(", ") || "all players"
        messages.push(`${court.name}.. Next scheduled: ${names}. Please prepare.`)
      }
    })

    if (!messages.length) return

    const groupedMessage = messages.join(" ")
    enqueueSpeak(`Attention... ${groupedMessage}`)
  }, [openPlayData?.courts, enqueueSpeak])

  // =====================
  // SINGLE INTERVAL LOOP
  // =====================
  useEffect(() => {
    const interval = setInterval(() => {
      const now = toPhilippineTime(new Date())
      setCurrentTime(now)

      // --- Auto end session ---
      if (openPlay?.id && !hasAutoEndedRef.current) {
        if (!openPlay.endTime) return
        const endTime = toPhilippineTime(new Date(openPlay.endTime))
        const isPastEnd = now.getTime() > endTime.getTime()
        const hasActiveGames = courts?.some((c) => c?.currentGame || c?.nextGame) ?? false
        if (isPastEnd && !hasActiveGames) {
          hasAutoEndedRef.current = true
          completeOpenPlayMutation.mutate(
            { id: openPlay.id },
            { onError: () => (hasAutoEndedRef.current = false) },
          )
        }
      }

      if (isQueueAvailable) {
        hasCancelledRef.current = false

        // --- Countdown prep ---
        const nextTransitionValue = nextTransitionRef.current
        if (nextTransitionValue) {
          const adjustedTransition = toPhilippineTime(
            new Date(nextTransitionValue.getTime() - (openPlay?.preparationSeconds ?? 0) * 1000),
          )
          const diff = adjustedTransition.getTime() - now.getTime()
          setPrepRemaining(diff > 0 ? diff : 0)

          if (diff <= 0 && lastRefetchRef.current !== nextTransitionValue.getTime()) {
            lastRefetchRef.current = nextTransitionValue.getTime()
            setTimeout(() => {
              refetchOpenPlayData()
            }, 1000) // 1 second delay
          }
        }
      } else {
        // if (!hasCancelledRef.current) {
        //   stopSpeaking()
        //   hasCancelledRef.current = true
        // }
      }

      // --- Auto announce ---
      if (openPlayData?.queues?.length && nextTransition) {
        const leadMinutes = openPlayData.openPlay?.announcementMinutesBeforeTransition ?? 0
        const leadMs = leadMinutes * 60 * 1000
        const nowSec = normalizeToPhilippineTimeSeconds(new Date())
        const transitionKey = nextTransition.toISOString()

        if (
          lastAnnouncedRef.current !== transitionKey &&
          nowSec - ((window as any).lastAnnounceTime || 0) >= GUARD_MS
        ) {
          const transitionTime = normalizeToPhilippineTimeSeconds(nextTransition)
          const diff = transitionTime - nowSec
          if (diff <= leadMs) {
            refetchOpenPlayData?.()
            lastAnnouncedRef.current = transitionKey
            ;(window as any).lastAnnounceTime = nowSec
          }
        }
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [
    isQueueAvailable,
    stopSpeaking,
    openPlay,
    courts,
    completeOpenPlayMutation,
    nextTransition,
    openPlayData?.queues,
    openPlayData?.lastUpdate,
  ])

  useEffect(() => {
    const unlockSpeech = () => {
      const u = new SpeechSynthesisUtterance(" ")
      u.volume = 0 // silent
      u.rate = 1
      u.pitch = 1
      window.speechSynthesis.speak(u)

      // remove listeners after first unlock
      window.removeEventListener("click", unlockSpeech)
      window.removeEventListener("touchstart", unlockSpeech)
    }

    // wait for first user gesture
    window.addEventListener("click", unlockSpeech)
    window.addEventListener("touchstart", unlockSpeech)
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem("announcements")
    if (stored) announcementsRef.current = JSON.parse(stored)
  }, [])

  const clearAnnouncements = () => {
    announcementsRef.current = []
    localStorage.removeItem("announcements")
  }

  if (isLoading || isLoadingOrgWithCourts) return <LoadingScreen message="Loading Queue" />
  if (!isQueueAvailable) {
    clearAnnouncements()
    return <OpenPlayUnavailable onRetry={refetchOpenPlayData} />
  }
  if (isOffline) return <InternetProblemPage onRetry={refetchOpenPlayData} quality={quality} />

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
              <div className="text-sm font-semibold">{openPlayData?.timeRange ?? ""}</div>
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
              <div className="text-xl font-black">
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
                      rounded-lg border border-dashed border-gray-500/20 px-2 lg:h-64 h-auto overflow-visible  lg:flex-1 lg:h-0 lg:overflow-auto
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
          <div className="py-4 uppercase text-5xl font-black text-white mb-4 text-center w-full">
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
                              {court.currentGame.players.map((player: any) => {
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
                              {court.nextGame.players.map((player: any) => {
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
              <span className="font-black text-lg text-primary uppercase">{firstName}</span>
              {restNames.length > 0 && (
                <span className="text-xs text-primary/80">{restNames.join(" ")}</span>
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

function InternetProblemPage({
  message = "No internet connection detected.",
  quality = "",
  onRetry,
}: {
  message?: string
  quality?: string
  onRetry?: () => void
}) {
  return (
    <div className="min-h-screen bg-[#092021] text-white flex items-center justify-center font-mono px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-black/70 border border-red-500/40 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
      >
        {/* ICON */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500 flex items-center justify-center">
            <WifiOff className="w-8 h-8 text-red-400" />
          </div>
        </div>

        {/* TITLE */}
        <h1 className="text-2xl font-bold text-white mb-2">Internet Connection Lost</h1>

        {/* MESSAGE */}
        <p className="text-red-300/70 text-sm mb-6">{message}</p>

        {/* QUALITY INDICATOR */}
        <div className="mb-4 text-xs text-white/60">
          Connection quality: <span className="font-bold">{quality}</span>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-black font-bold py-3 rounded-xl transition active:scale-95"
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
