"use client"

import { useState, useEffect, useRef } from "react"
import { PlayCircle, Users, Volume2, VolumeX, Megaphone } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { motion, useAnimation } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { QueueGroup, useQueueManager } from "@/lib/hooks/queue/use-queue-manager"

const announcementRepeats = 2
const announcementDelay = 2

export default function OpenPlayQueue({ openPlay }: { openPlay: any }) {
  // const [currentGames] = useState([
  //   {
  //     courtNumber: 1,
  //     players: [
  //       "Player 1 Name here",
  //       "Player 2 Name here",
  //       "Player 3 Name here",
  //       "Player 4 Name here",
  //     ], // 4 players (2v2)
  //     startTime: new Date(Date.now() - 1000 * 60 * 22),
  //     estimatedEndTime: new Date(Date.now() + openPlay.transitionMinutes * 60000),
  //   },
  //   {
  //     courtNumber: 2,
  //     players: ["Player 5", "Player 6"], // 2 players (1v1)
  //     startTime: new Date(Date.now() - 1000 * 60 * 18),
  //     estimatedEndTime: new Date(Date.now() + openPlay.transitionMinutes * 60000),
  //   },
  // ])

  // // Waiting Lineup - Minimum 2 players per group, even count (2 or 4)
  // const [queue] = useState([
  //   {
  //     id: "q1",
  //     position: 1,
  //     scheduledAt: new Date(Date.now() + 1000 * 60 * 4),
  //     courtNumber: 1,
  //     players: ["Player 9", "Player 10"],
  //   },
  //   {
  //     id: "q2",
  //     position: 2,
  //     scheduledAt: new Date(Date.now() + 1000 * 60 * 4),
  //     courtNumber: 2,
  //     players: ["Player 11", "Player 12"],
  //   },
  //   {
  //     id: "q3",
  //     position: 3,
  //     scheduledAt: new Date(Date.now() + 1000 * 60 * 34),
  //     courtNumber: 1,
  //     players: [
  //       "Player 13 Name here",
  //       "Player 14 Name here",
  //       "Player 15 Name here",
  //       "Player 16 Name here",
  //     ],
  //   },
  //   {
  //     id: "q4",
  //     position: 4,
  //     scheduledAt: new Date(Date.now() + 1000 * 60 * 34),
  //     courtNumber: 2,
  //     players: ["Player 17", "Player 18"],
  //   },
  //   {
  //     id: "q5",
  //     position: 5,
  //     scheduledAt: new Date(Date.now() + 1000 * 60 * 64),
  //     courtNumber: 1,
  //     players: ["Player 19", "Player 20"],
  //   },
  //   {
  //     id: "q6",
  //     position: 6,
  //     scheduledAt: new Date(Date.now() + 1000 * 60 * 64),
  //     courtNumber: 2,
  //     players: ["Player 21", "Player 22", "Player 23", "Player 24"],
  //   },
  //   {
  //     id: "q7",
  //     position: 7,
  //     scheduledAt: new Date(Date.now() + 1000 * 60 * 94),
  //     courtNumber: 1,
  //     players: ["Player 25", "Player 26"],
  //   },
  //   {
  //     id: "q8",
  //     position: 8,
  //     scheduledAt: new Date(Date.now() + 1000 * 60 * 94),
  //     courtNumber: 2,
  //     players: ["Player 27", "Player 28"],
  //   },
  // ])

  // const [currentTime, setCurrentTime] = useState(new Date())
  // const [isSpeaking, setIsSpeaking] = useState(false)
  // const [audioEnabled, setAudioEnabled] = useState(true)

  // const speechRef = useRef<SpeechSynthesisUtterance | null>(null)
  // const lastAnnouncedRef = useRef<string>("")

  // // Live clock
  // useEffect(() => {
  //   const interval = setInterval(() => setCurrentTime(new Date()), 1000)
  //   return () => clearInterval(interval)
  // }, [])

  // // Auto announcement
  // useEffect(() => {
  //   if (!audioEnabled || queue.length === 0) return
  //   const next = queue[0]
  //   const key = `announce-${next.id}`

  //   if (lastAnnouncedRef.current !== key || Date.now() - (window as any).lastAnnounceTime > 40000) {
  //     const names = next.players.join(" and ")
  //     const court = next.courtNumber ? `Court ${next.courtNumber}` : "next available court"
  //     speak(`Attention please. Next group: ${names} on ${court}.`)
  //     lastAnnouncedRef.current = key
  //     ;(window as any).lastAnnounceTime = Date.now()
  //   }
  // }, [queue, audioEnabled])

  // const speak = (text: string) => {
  //   if (!("speechSynthesis" in window)) return
  //   window.speechSynthesis.cancel()

  //   let count = 0

  //   const speakOnce = () => {
  //     if (count >= announcementRepeats) return

  //     const utterance = new SpeechSynthesisUtterance(text)
  //     utterance.rate = 0.95
  //     utterance.pitch = 1.05
  //     utterance.volume = 0.9

  //     utterance.onstart = () => setIsSpeaking(true)
  //     utterance.onend = () => {
  //       setIsSpeaking(false)
  //       count++
  //       if (count < announcementRepeats) setTimeout(speakOnce, announcementDelay * 1000)
  //     }

  //     speechRef.current = utterance
  //     window.speechSynthesis.speak(utterance)
  //   }

  //   speakOnce()
  // }

  // const manualAnnounce = () => {
  //   if (queue.length === 0) return
  //   const next = queue[0]
  //   const names = next.players.join(" and ")
  //   const court = next.courtNumber ? `Court ${next.courtNumber}` : "next available court"
  //   speak(`Attention please. Next group: ${names} on ${court}.`)
  // }

  // const toggleAudio = () => {
  //   setAudioEnabled((prev) => {
  //     const next = !prev

  //     if (next === false) {
  //       window.speechSynthesis.cancel()
  //       setIsSpeaking(false)
  //     }

  //     return next
  //   })
  // }

  // const getCountdown = (target: Date): string => {
  //   const diff = target.getTime() - currentTime.getTime()
  //   if (diff <= 0) return "NOW"
  //   const min = Math.floor(diff / 60000)
  //   const sec = Math.floor((diff % 60000) / 1000)
  //   return `${min}:${sec.toString().padStart(2, "0")}`
  // }

  //#v2
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)

  const speechRef = useRef<SpeechSynthesisUtterance | null>(null)
  const lastAnnouncedRef = useRef<string>("")

  const {
    currentGames,
    queue,
    allPlayers,
    getCountdown,
    addGroupToQueue,
    removeFromQueue,
    moveNextGroupToCourt,
    freeCourts,
  } = useQueueManager(openPlay)

  console.info({ openPlay, currentGames, queue, allPlayers })

  // Auto announcement
  useEffect(() => {
    if (!audioEnabled || queue.length === 0) return
    const next = queue[0]
    const key = `announce-${next.id}`

    if (lastAnnouncedRef.current !== key || Date.now() - (window as any).lastAnnounceTime > 40000) {
      const names = next.players.join(" and ")
      const court = next.courtName ? `${next.courtName}` : "next available court"
      speak(`Attention please. Next group: ${names} on ${court}.`)
      lastAnnouncedRef.current = key
      ;(window as any).lastAnnounceTime = Date.now()
    }
  }, [queue, audioEnabled])

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()

    let count = 0

    const speakOnce = () => {
      if (count >= announcementRepeats) return

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.95
      utterance.pitch = 1.05
      utterance.volume = 0.9

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => {
        setIsSpeaking(false)
        count++
        if (count < announcementRepeats) setTimeout(speakOnce, announcementDelay * 1000)
      }

      speechRef.current = utterance
      window.speechSynthesis.speak(utterance)
    }

    speakOnce()
  }

  const manualAnnounce = () => {
    if (queue.length === 0) return
    const next = queue[0]
    const names = next.players.join(" and ")
    const court = next.courtName ? `${next.courtName}` : "next available court"
    speak(`Attention please. Next group: ${names} on ${court}.`)
  }

  const toggleAudio = () => {
    setAudioEnabled((prev) => {
      const next = !prev

      if (next === false) {
        window.speechSynthesis.cancel()
        setIsSpeaking(false)
      }

      return next
    })
  }

  return (
    <div className="flex flex-1 flex-col lg:flex-row p-4 md:p-6 lg:p-8 gap-6 lg:gap-8 overflow-y-auto lg:overflow-hidden">
      {/* NOW PLAYING - 2 Courts */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={toggleAudio}>
            {audioEnabled ? <Volume2 className="w-8 h-8" /> : <VolumeX className="w-8 h-8" />}
          </button>
          <Megaphone
            onClick={manualAnnounce}
            className="w-8 h-8 text-emerald-500 cursor-pointer hover:text-emerald-400 transition"
          />
          <h2 className="text-3xl md:text-4xl font-bold text-white uppercase">
            {isSpeaking ? "Announcing..." : "Now Playing"}
          </h2>
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
            <Users className="w-8 h-8 text-emerald-400" />
            <h2 className="text-3xl md:text-4xl font-bold text-white">WAITING LINEUP</h2>
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
