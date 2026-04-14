"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  PlayCircle,
  Users,
  Volume2,
  VolumeX,
  Megaphone,
  MirrorRectangularIcon,
  Volleyball,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { motion, useAnimation } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { QueueGroup, useQueueManager } from "@/lib/hooks/queue/use-queue-manager"
import { useVoice } from "@/lib/hooks/speech/use-voice"
import { EventBusKeys, useEventListener } from "@/lib/client/event-bus"

export default function OpenPlayQueue({ openPlay }: { openPlay: any }) {
  //#v2
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const lastAnnouncedRef = useRef<string>("")
  const { speak } = useVoice()

  const {
    currentGames,
    queue,
    getCountdown,
    addGroupToQueue,
    removeFromQueue,
    moveNextGroupToCourt,
    freeCourts,
    rebuildQueue,
  } = useQueueManager(openPlay)

  const handleRebuildQueue = useCallback(
    (data: { openPlayId: string; playerId?: string }) => {
      if (data.openPlayId !== openPlay.id) return

      rebuildQueue()
      console.info(`[OpenPlayQueue] New player joined ${openPlay.id}. Queue rebuilt.`)
    },
    [openPlay.id, rebuildQueue],
  )

  // Subscribe to the clean event
  useEventListener(EventBusKeys.OPENPLAY_PLAYER_ADD, handleRebuildQueue)

  // Auto announcement
  useEffect(() => {
    if (!audioEnabled || queue.length === 0) return
    const next = queue[0]
    const key = `announce-${next.id}`

    if (lastAnnouncedRef.current !== key || Date.now() - (window as any).lastAnnounceTime > 40000) {
      const names = next.players.map((p) => p.playerName).join(", ")
      const court = next.courtName ? `${next.courtName}` : "next available court"
      speakCourtWithPlayers({ names, court })
      lastAnnouncedRef.current = key
      ;(window as any).lastAnnounceTime = Date.now()
    }
  }, [queue, audioEnabled])

  const manualAnnounce = () => {
    if (queue.length === 0) return
    const next = queue[0]
    const names = next.players.map((p) => p.playerName).join(", ")
    const court = next.courtName ? `${next.courtName}` : "next available court"
    speakCourtWithPlayers({ names, court })
  }

  const toggleAudio = () => {
    setAudioEnabled((prev) => {
      const next = !prev
      if (!next) {
        window.speechSynthesis.cancel()
        setIsSpeaking(false)
      }
      return next
    })
  }

  const speakCourtWithPlayers = ({ names, court }: { names: string; court: string }) => {
    speak(`Attention please. Next Player: ${names} on ${court}.`, 1, 2, setIsSpeaking)
  }

  return (
    <div className="flex flex-1 flex-col lg:flex-row p-4 md:p-6 lg:p-8 gap-6 lg:gap-8 overflow-y-auto lg:overflow-hidden">
      {/* NOW PLAYING - 2 Courts */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-5">
          <Volleyball className="w-8 h-8 text-emerald-500 cursor-pointer hover:text-emerald-400 transition" />
          <h2 className="text-3xl md:text-4xl font-bold text-white uppercase">Now Playing</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
          {currentGames.map((game) => (
            <Card
              key={game.courtName}
              className="bg-zinc-900/80 border border-emerald-500/40 backdrop-blur-sm flex flex-col h-full"
            >
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-3xl font-bold text-emerald-100">
                    {game.courtName}
                  </CardTitle>
                  <Badge className="bg-emerald-500 text-black text-lg px-6 py-1 font-semibold">
                    LIVE
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="flex flex-wrap gap-x-8 gap-y-2 text-lg lg:text-3xl font-bold text-white tracking-wide uppercase">
                  {game.players.map((p: any, i: number) => (
                    <div key={i} className="flex items-center">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] mr-3 shrink-0" />
                      <span>{p.playerName}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-8">
                  <div className="text-emerald-300/70 text-base">TIME LEFT</div>
                  <div className="text-2xl lg:text-7xl font-bold text-emerald-400 tabular-nums tracking-tighter">
                    {getCountdown(game.estimatedEndTime)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* WAITING LINEUP */}
      <div className="w-full lg:w-6/12 flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {/* <h2 className="text-3xl md:text-4xl font-bold text-white">WAITING LINEUP</h2> */}
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-emerald-400" />
              <h2 className="text-3xl md:text-4xl font-bold text-white uppercase">
                {isSpeaking ? "Announcing..." : "Waiting Lineup"}
              </h2>
              {/* <button onClick={toggleAudio}>
                {audioEnabled ? <Volume2 className="w-8 h-8" /> : <VolumeX className="w-8 h-8" />}
              </button> */}
              <Megaphone
                onClick={manualAnnounce}
                className="w-8 h-8 text-emerald-500 cursor-pointer hover:text-emerald-400 transition"
              />
            </div>
          </div>
          <Badge
            variant="outline"
            className="text-2xl px-8 py-3 border-emerald-500 text-emerald-400"
          >
            {queue.length} GROUPS
          </Badge>
        </div>

        {/* Main List */}
        <Card className="flex-1 min-h-0 bg-zinc-950/60 border-emerald-500/20 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden flex flex-col">
          {/* Header (compact) */}
          <CardHeader className="hidden lg:grid grid-cols-12 px-6 py-3 bg-zinc-900/60 border-b border-emerald-500/10 tracking-widest uppercase text-emerald-300">
            <div className="col-span-2">Scheduled</div>
            <div className="col-span-7">Players</div>
            <div className="col-span-3 text-right">Countdown / Court</div>
          </CardHeader>

          {/* Scroll */}
          <ScrollArea className="flex-1 min-h-0">
            <CardContent className="p-0 divide-y divide-emerald-900/20">
              {queue.map((item: QueueGroup) => (
                <div
                  key={item.id}
                  className={[
                    "grid grid-cols-1 lg:grid-cols-12 items-center",
                    "px-6 py-3 lg:py-2.5 gap-2 lg:gap-4",
                    "transition-colors duration-200",
                    "hover:bg-emerald-950/30",
                    item.position === 1 ? "bg-emerald-500/10" : "",
                  ].join(" ")}
                >
                  {/* Time */}
                  <div className="lg:col-span-2">
                    <span className="text-emerald-200 font-medium tabular-nums text-sm lg:text-base">
                      {item.scheduledAt.toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Players (BIG + readable, NOT badges) */}
                  <div className="lg:col-span-7">
                    <div className="text-white font-semibold text-lg lg:text-xl tracking-wide uppercase leading-snug whitespace-normal break-words">
                      {item.players.map((p) => p.playerName).join(" • ")}
                    </div>
                  </div>

                  {/* Countdown / Court */}
                  <div className="lg:col-span-3 flex lg:flex-col items-start lg:items-end justify-between lg:justify-center gap-1">
                    <div className="text-emerald-400 font-bold tabular-nums text-lg lg:text-xl">
                      {getCountdown(item.scheduledAt)}
                    </div>

                    {item.courtName && (
                      <div className="text-xs lg:text-sm text-emerald-300/80 font-semibold uppercase">
                        {item.courtName}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </ScrollArea>

          {/* Footer (compact) */}
          <div className="border-t border-emerald-500/10 bg-zinc-900/40 py-1">
            <FooterCarousel queue={queue} />
          </div>
        </Card>
      </div>
    </div>
  )
}

const FooterCarousel = ({ queue }: { queue: any[] }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const controls = useAnimation()
  const [contentWidth, setContentWidth] = useState(0)

  const SPEED = 30 // 50px per second, adjust to your liking

  // Measure width after first render
  useEffect(() => {
    if (contentRef.current) {
      setContentWidth(contentRef.current.offsetWidth)
    }
  }, [queue])

  // Trigger animation after width is known
  useEffect(() => {
    if (contentWidth === 0) return
    const containerWidth = containerRef.current?.offsetWidth || 0
    const totalDistance = contentWidth + containerWidth

    // Duration = distance / speed
    const duration = totalDistance / SPEED

    controls.start({
      x: [containerWidth, -contentWidth],
      transition: { duration, ease: "linear", repeat: Infinity },
    })
  }, [contentWidth, controls])

  return (
    <div
      ref={containerRef}
      className="w-full h-20 bg-zinc-800/90 border-t border-emerald-500/30 overflow-hidden relative"
    >
      <motion.div
        ref={contentRef}
        className="absolute whitespace-nowrap flex gap-8 items-center py-3"
        animate={controls}
        initial={{ x: 0 }}
      >
        {queue.map((item: QueueGroup) => (
          <div
            key={`footer-${item.id}`}
            className="flex flex-row items-center bg-emerald-900/30 rounded-xl px-4 py-2 min-w-[250px] space-x-4"
          >
            <div className="text-emerald-400 font-bold text-lg min-w-[50px]">
              G{item.position}-
              {item.scheduledAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </div>
            <div className="text-white text-xl font-bold truncate uppercase tracking-wide">
              {item.players.map((p) => p.playerName).join(", ")}
            </div>
            <div className="text-emerald-300 text-md min-w-[80px] text-right">
              {item.courtName || "-"}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  )
}
