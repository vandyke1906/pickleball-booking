"use client"

import { useEffect, useRef, useState, useCallback } from "react"

type SpeakOptions = {
  repeats?: number
  delaySec?: number
  rate?: number
  pitch?: number
  volume?: number
}

type QueueItem = {
  text: string
  repeats: number
  delaySec: number
}

export const useSpeech = (isQueueAvailable: boolean) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [voicesReady, setVoicesReady] = useState(false)

  const queueRef = useRef<QueueItem[]>([])
  const speakingRef = useRef(false)

  /** Load voices */
  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis.getVoices()
      if (!v.length) return setTimeout(load, 200)

      setVoices(v)

      const voice =
        v.find((x) => x.lang.includes("en-US")) ||
        v.find((x) => x.lang.includes("en-GB")) ||
        v.find((x) => x.lang.includes("en")) ||
        v[0]

      setSelectedVoice(voice || null)
      setVoicesReady(true)
    }

    window.speechSynthesis.onvoiceschanged = load
    load()
  }, [])

  /** Core speak */
  const speak = useCallback(
    (item: QueueItem) => {
      const { text, repeats, delaySec } = item

      let count = 0

      const run = () => {
        if (!text) return

        const voice = selectedVoice || voices[0]
        if (!voice) return setTimeout(run, 200)

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.voice = voice
        utterance.lang = "en-US"

        utterance.onstart = () => {
          speakingRef.current = true
        }

        utterance.onend = () => {
          count++
          speakingRef.current = false

          if (count < repeats) {
            setTimeout(run, delaySec * 1000)
          } else {
            processQueue()
          }
        }

        window.speechSynthesis.speak(utterance)
      }

      run()
    },
    [voices, selectedVoice],
  )

  /** Process queue */
  const processQueue = useCallback(() => {
    if (!isQueueAvailable || speakingRef.current) return

    const next = queueRef.current.shift()
    if (!next) return

    speak(next)
  }, [isQueueAvailable, speak])

  /** Public API */
  const enqueueSpeak = useCallback(
    (text: string, options: SpeakOptions = {}) => {
      if (!voicesReady) return

      if (!isQueueAvailable) {
        window.speechSynthesis.cancel()
        queueRef.current = []
        return
      }

      const item: QueueItem = {
        text,
        repeats: options.repeats ?? 1,
        delaySec: options.delaySec ?? 2,
      }

      queueRef.current.push(item)

      if (!speakingRef.current) {
        processQueue()
      }
    },
    [voicesReady, isQueueAvailable, processQueue],
  )

  /** Stop */
  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel()
    queueRef.current = []
    speakingRef.current = false
  }, [])

  return {
    voices,
    selectedVoice,
    setSelectedVoice,
    enqueueSpeak,
    stopSpeaking,
  }
}
