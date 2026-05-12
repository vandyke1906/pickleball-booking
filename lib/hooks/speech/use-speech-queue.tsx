"use client"

import { useVoice } from "@/lib/hooks/speech/use-voice"
import { useEffect, useRef, useState } from "react"

export const useSpeechQueue = (isQueueAvailable: boolean) => {
  const { speak } = useVoice()
  const speechQueueRef = useRef<string[]>([])
  const speakingRef = useRef(false)
  const [voicesReady, setVoicesReady] = useState(false)


  const processQueue = () => {
    if (!isQueueAvailable || speakingRef.current) return
    const text = speechQueueRef.current.shift()
    console.info({text})
    if (!text) return

    // speakingRef.current = true
    console.info("#######speak now")
    speak(text, 1, 2, (speaking) => {
      speakingRef.current = speaking
      if (!speaking) processQueue()
    })
  }

  const enqueueSpeak = (text: string) => {

    console.info({voicesReady, isQueueAvailablevoices: window.speechSynthesis.getVoices(), current: speechQueueRef.current})
    if (!voicesReady) {
      console.warn("Voices not ready yet")
      return
    }

    if (!isQueueAvailable) {
      stopSpeaking()
      return
    }

    if (!window.speechSynthesis.getVoices().length) {
      console.warn("Voices not ready, delaying enqueue")
      setTimeout(() => enqueueSpeak(text), 500)
      return
    }

    if (speechQueueRef.current.includes(text)) return
    speechQueueRef.current.push(text)
    if (!speakingRef.current) processQueue()
  }


  const stopSpeaking = () => {
    window.speechSynthesis.cancel()
    speechQueueRef.current = []
    speakingRef.current = false
  }

  
  useEffect(() => {
    const checkVoices = () => {
      const v = window.speechSynthesis.getVoices()
      if (v.length) setVoicesReady(true)
      else setTimeout(checkVoices, 200)
    }
    checkVoices()
  }, [])

  return { enqueueSpeak, stopSpeaking }
}