// useVoice.tsx
import { useEffect, useRef, useState } from "react"

export const useVoice = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Load voices once
  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices()
      setVoices(available)
      const voice =
        available.find((v) => v.lang.toLowerCase().includes("fil-ph")) ||
        available.find((v) => v.lang.toLowerCase().includes("en-ph")) ||
        available[0]

      setSelectedVoice(voice || null)
    }

    window.speechSynthesis.onvoiceschanged = loadVoices
    loadVoices()
  }, [])

  const speak = (
    text: string,
    announcementRepeats = 1,
    announcementDelay = 2,
    onSpeaking?: (val: boolean) => void,
    options?: { rate?: number; pitch?: number; volume?: number },
  ) => {
    if (!("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()

    let count = 0

    const speakOnce = () => {
      if (count >= announcementRepeats) return

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.voice = selectedVoice
      utterance.rate = options?.rate ?? 0.9
      utterance.pitch = options?.pitch ?? 1.05
      utterance.volume = options?.volume ?? 0.9

      utterance.onstart = () => onSpeaking?.(true)
      utterance.onend = () => {
        onSpeaking?.(false)
        count++
        if (count < announcementRepeats) {
          setTimeout(speakOnce, announcementDelay * 1000)
        }
      }

      speechRef.current = utterance
      window.speechSynthesis.speak(utterance)
    }

    speakOnce()
  }

  return { voices, selectedVoice, setSelectedVoice, speak }
}
