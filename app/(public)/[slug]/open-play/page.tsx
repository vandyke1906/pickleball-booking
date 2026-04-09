"use client"

import React, { useState, useEffect, useRef } from "react"
import { PlayCircle, Users, Volume2, VolumeX, Megaphone } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { motion, useAnimation } from "framer-motion"

export default function PickleballOpenPlayQueue() {
  // Your real OpenPlay data
  const openPlay = {
    id: "op1",
    startTime: new Date("2026-04-09T09:00:00.000Z"),
    endTime: new Date("2026-04-09T17:00:00.000Z"),
    transitionMinutes: 30,
    status: "active",
    courts: [
      { id: "court1", name: "Court 1" },
      { id: "court2", name: "Court 2" },
    ],
    players: Array.from({ length: 32 }, (_, i) => ({
      id: `p${i + 1}`,
      code: `PL${String(i + 1).padStart(3, "0")}`,
      playerName: `Player ${i + 1}`,
    })),
  }

  // Currently playing (max 4 per court, even numbers: 2 or 4)
  const [currentGames] = useState([
    {
      courtNumber: 1,
      players: ["Player 1", "Player 2", "Player 3", "Player 4"], // 4 players (2v2)
      startTime: new Date(Date.now() - 1000 * 60 * 22),
      estimatedEndTime: new Date(Date.now() + openPlay.transitionMinutes * 60000),
    },
    {
      courtNumber: 2,
      players: ["Player 5", "Player 6"], // 2 players (1v1)
      startTime: new Date(Date.now() - 1000 * 60 * 18),
      estimatedEndTime: new Date(Date.now() + openPlay.transitionMinutes * 60000),
    },
  ])

  // Waiting Lineup - Minimum 2 players per group, even count (2 or 4)
  const [queue] = useState([
    {
      id: "q1",
      position: 1,
      scheduledAt: new Date(Date.now() + 1000 * 60 * 4),
      courtNumber: 1,
      players: ["Player 9", "Player 10"],
    },
    {
      id: "q2",
      position: 2,
      scheduledAt: new Date(Date.now() + 1000 * 60 * 4),
      courtNumber: 2,
      players: ["Player 11", "Player 12"],
    },
    {
      id: "q3",
      position: 3,
      scheduledAt: new Date(Date.now() + 1000 * 60 * 34),
      courtNumber: 1,
      players: ["Player 13", "Player 14", "Player 15", "Player 16"],
    },
    {
      id: "q4",
      position: 4,
      scheduledAt: new Date(Date.now() + 1000 * 60 * 34),
      courtNumber: 2,
      players: ["Player 17", "Player 18"],
    },
    {
      id: "q5",
      position: 5,
      scheduledAt: new Date(Date.now() + 1000 * 60 * 64),
      courtNumber: 1,
      players: ["Player 19", "Player 20"],
    },
    {
      id: "q6",
      position: 6,
      scheduledAt: new Date(Date.now() + 1000 * 60 * 64),
      courtNumber: 2,
      players: ["Player 21", "Player 22", "Player 23", "Player 24"],
    },
    {
      id: "q7",
      position: 7,
      scheduledAt: new Date(Date.now() + 1000 * 60 * 94),
      courtNumber: 1,
      players: ["Player 25", "Player 26"],
    },
    {
      id: "q8",
      position: 8,
      scheduledAt: new Date(Date.now() + 1000 * 60 * 94),
      courtNumber: 2,
      players: ["Player 27", "Player 28"],
    },
  ])

  const [currentTime, setCurrentTime] = useState(new Date())
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)

  const speechRef = useRef<SpeechSynthesisUtterance | null>(null)
  const lastAnnouncedRef = useRef<string>("")

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Auto announcement
  useEffect(() => {
    if (!audioEnabled || queue.length === 0) return
    const next = queue[0]
    const key = `announce-${next.id}`

    if (lastAnnouncedRef.current !== key || Date.now() - (window as any).lastAnnounceTime > 40000) {
      const names = next.players.join(" and ")
      const court = next.courtNumber ? `Court ${next.courtNumber}` : "next available court"
      speak(`Attention please. Next group: ${names} on ${court}.`)
      lastAnnouncedRef.current = key
      ;(window as any).lastAnnounceTime = Date.now()
    }
  }, [queue, audioEnabled])

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.pitch = 1.05
    utterance.volume = 0.9

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)

    speechRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  const manualAnnounce = () => {
    if (queue.length === 0) return
    const next = queue[0]
    const names = next.players.join(" and ")
    const court = next.courtNumber ? `Court ${next.courtNumber}` : "next available court"
    speak(`Attention please. Next group: ${names} on ${court}.`)
  }

  const toggleAudio = () => {
    setAudioEnabled((prev) => !prev)
    if (audioEnabled) window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }

  const getCountdown = (target: Date): string => {
    const diff = target.getTime() - currentTime.getTime()
    if (diff <= 0) return "NOW"
    const min = Math.floor(diff / 60000)
    const sec = Math.floor((diff % 60000) / 1000)
    return `${min}:${sec.toString().padStart(2, "0")}`
  }

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
              {openPlay.courts.length} Courts • {openPlay.transitionMinutes} min transitions •
              {openPlay.startTime.toLocaleDateString()} • Live Session
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <div className="hidden sm:block text-right">
            <div className="text-emerald-300/70 text-sm">CURRENT TIME</div>
            <div className="text-4xl md:text-6xl font-bold tabular-nums text-emerald-400">
              {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={toggleAudio}
              variant="outline"
              className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 px-5 py-6 text-2xl"
            >
              {audioEnabled ? <Volume2 className="w-8 h-8" /> : <VolumeX className="w-8 h-8" />}
            </Button>

            <Button
              onClick={manualAnnounce}
              className="bg-emerald-500 hover:bg-emerald-600 text-black px-6 py-6 text-2xl font-bold flex items-center gap-3 shadow-md"
            >
              <Megaphone className="w-7 h-7" />
              <span className="hidden md:inline">ANNOUNCE NEXT</span>
            </Button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 flex-col lg:flex-row p-4 md:p-6 lg:p-8 gap-6 lg:gap-8 overflow-hidden">
        {/* NOW PLAYING - 2 Courts */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-3 mb-5">
            <PlayCircle className="w-8 h-8 text-emerald-500" />
            <h2 className="text-3xl md:text-4xl font-bold text-white">NOW PLAYING</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
            {currentGames.map((game) => (
              <Card
                key={game.courtNumber}
                className="bg-zinc-900/80 border border-emerald-500/40 backdrop-blur-sm flex flex-col h-full"
              >
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-3xl font-bold text-emerald-100">
                      Court {game.courtNumber}
                    </CardTitle>
                    <Badge className="bg-emerald-500 text-black text-lg px-6 py-1 font-semibold">
                      LIVE
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="text-2xl font-medium text-white tracking-wide">
                    {game.players.join(", ")}
                  </div>
                  <div className="mt-8">
                    <div className="text-emerald-300/70 text-base">TIME LEFT</div>
                    <div className="text-5xl font-bold text-emerald-400 tabular-nums tracking-tighter">
                      {getCountdown(game.estimatedEndTime)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* WAITING LINEUP */}
        <div className="w-full lg:w-5/12 flex flex-col relative">
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
          <div className="flex-1 bg-zinc-900/80 rounded-3xl border border-emerald-500/30 overflow-hidden flex flex-col backdrop-blur-sm">
            {/* Table Header */}
            <div className="hidden lg:grid grid-cols-12 bg-zinc-800/80 py-4 px-8 text-sm uppercase tracking-widest text-emerald-300 border-b border-emerald-500/20">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-3">SCHEDULED</div>
              <div className="col-span-5">PLAYERS (2 or 4)</div>
              <div className="col-span-3 text-right">COUNTDOWN • COURT</div>
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-auto divide-y divide-emerald-900/50 text-base">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className={`grid grid-cols-1 lg:grid-cols-12 items-center px-8 py-5 gap-4 lg:gap-0 hover:bg-emerald-950/50 transition-colors ${
                    item.position === 1 ? "bg-emerald-500/10" : ""
                  }`}
                >
                  <div className="lg:col-span-1 flex justify-center lg:justify-start">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-3xl font-bold flex-shrink-0 ${
                        item.position === 1
                          ? "bg-emerald-500 text-black"
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {item.position}
                    </div>
                  </div>

                  <div className="lg:col-span-3 font-bold tabular-nums text-xl text-emerald-100">
                    {item.scheduledAt.toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>

                  <div className="lg:col-span-5 text-xl font-medium text-white leading-relaxed break-words pr-4">
                    {item.players.join(", ")}
                  </div>

                  <div className="lg:col-span-3 text-right">
                    <div className="text-4xl font-bold text-emerald-400 tabular-nums tracking-tighter">
                      {getCountdown(item.scheduledAt)}
                    </div>
                    {item.courtNumber && (
                      <div className="text-lg text-emerald-300/70 mt-1">
                        Court {item.courtNumber}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Carousel */}
            <FooterCarousel queue={queue} />
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-black/80 border-t border-emerald-600 py-4 text-center text-emerald-300/70 text-xl flex-shrink-0">
        Shared {openPlay.transitionMinutes}-minute transition • 2 or 4 players per group • Max 4 per
        court
      </footer>
    </div>
  )
}

const FooterCarousel = ({ queue }: { queue: any[] }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const controls = useAnimation()
  const [contentWidth, setContentWidth] = useState(0)

  const SPEED = 50 // 50px per second, adjust to your liking

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
        {queue.map((item) => (
          <div
            key={`footer-${item.id}`}
            className="flex flex-row items-center bg-emerald-900/30 rounded-xl px-4 py-2 min-w-[250px] space-x-4"
          >
            <div className="text-emerald-400 font-bold text-lg min-w-[50px]">G{item.position}</div>
            <div className="text-white text-sm truncate">{item.players.join(", ")}</div>
            <div className="text-emerald-300 text-xs min-w-[80px] text-right">
              {item.scheduledAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} •
              Court {item.courtNumber || "-"}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  )
}
