"use client"

import { useEffect, useRef, useState } from "react"

type SpeechQueueItem = {
  text: string
  repeats: number
  delaySec: number
}

export const useSpeech = (isQueueAvailable: boolean) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [voicesReady, setVoicesReady] = useState(false)

  const speechQueueRef = useRef<string[]>([])
  const speakingRef = useRef(false)

  /** Load voices once and retry until available */
  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices()
      if (!available.length) {
        setTimeout(loadVoices, 250)
        return
      }
      setVoices(available)
      const voice =
        available.find((v) => v.lang.toLowerCase().includes("en-us")) ||
        available.find((v) => v.lang.toLowerCase().includes("en-gb")) ||
        available.find((v) => v.lang.toLowerCase().includes("en")) ||
        available.find((v) => v.lang.toLowerCase().includes("fil-ph")) ||
        available.find((v) => v.lang.toLowerCase().includes("en-ph")) ||
        available[0]
      setSelectedVoice(voice || null)
      setVoicesReady(true)
    }

    window.speechSynthesis.onvoiceschanged = loadVoices
    loadVoices()
  }, [])

  /** Core speak function */
  const speak = (
    text: string,
    repeats = 1,
    delaySec = 2,
    onSpeaking?: (val: boolean) => void,
    options?: { rate?: number; pitch?: number; volume?: number },
  ) => {
    if (!("speechSynthesis" in window)) {
      console.warn("Speech synthesis not supported")
      return
    }

    let count = 0
    const speakOnce = () => {
      if (count >= repeats) return

      const voice = selectedVoice || voices[0]
      if (!voice) {
        console.warn("No voices yet, retrying...")
        setTimeout(speakOnce, 300)
        return
      }

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.voice = voice
      utterance.lang = "en-US"
      utterance.rate = options?.rate ?? 1
      utterance.pitch = options?.pitch ?? 1
      utterance.volume = options?.volume ?? 1

      utterance.onstart = () => {
        speakingRef.current = true
        onSpeaking?.(true)
      }
      utterance.onend = () => {
        speakingRef.current = false
        onSpeaking?.(false)
        count++
        if (count < repeats) setTimeout(speakOnce, delaySec * 1000)
        else processQueue() // continue with next queued item
      }

      window.speechSynthesis.speak(utterance)
    }

    speakOnce()
  }

  /** Queue processor */
  const processQueue = () => {
    if (!isQueueAvailable || speakingRef.current) return
    // const text = speechQueueRef.current.shift()
    // if (!text) return
    // speak(text)

    const item = speechQueueRef.current.shift()
    if (!item) return
    const [text, repeatsStr, delayStr] = item.split("|||")

    speak(text, Number(repeatsStr ?? 1), Number(delayStr ?? 2))
  }

  /** Public enqueue function */
  const enqueueSpeak = (text: string, repeats = 1, delaySec = 2, onComplete = () => {}) => {
    if (!voicesReady) {
      console.warn("Voices not ready yet")
      setTimeout(() => enqueueSpeak(text, repeats, delaySec), 500)
      return
    }

    if (!isQueueAvailable) {
      stopSpeaking()
      return
    }

    // if (speechQueueRef.current.includes(text)) return
    // speechQueueRef.current.push(text)

    const encoded = `${text}|||${repeats}|||${delaySec}`
    if (speechQueueRef.current.includes(encoded)) return
    speechQueueRef.current.push(encoded)

    if (!speakingRef.current) processQueue()
    onComplete?.()
  }

  /** Stop everything immediately */
  const stopSpeaking = () => {
    window.speechSynthesis.cancel()
    speechQueueRef.current = []
    speakingRef.current = false
  }

  return { voices, selectedVoice, setSelectedVoice, enqueueSpeak, stopSpeaking }
}
