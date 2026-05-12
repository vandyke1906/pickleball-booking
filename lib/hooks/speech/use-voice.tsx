import { useEffect, useState } from "react"

export const useVoice = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)

  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices()
      if (!available.length) {
        // Retry until voices are loaded
        setTimeout(loadVoices, 250)
        return
      }
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

      const availableVoices = voices.length ? voices : window.speechSynthesis.getVoices()
      const voice = selectedVoice || availableVoices[0]

      if (!voice) {
        console.warn("No voices yet, retrying...")
        setTimeout(speakOnce, 300)
        return
      }

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.voice = voice
      utterance.rate = options?.rate ?? 1.1
      utterance.pitch = options?.pitch ?? 1.1
      utterance.volume = options?.volume ?? 0.9

      console.info({utterance})

      utterance.onstart = () => {
        console.info("****utterance start")
        onSpeaking?.(true)
      }
      utterance.onend = () => {
        onSpeaking?.(false)
        count++
        if (count < repeats) setTimeout(speakOnce, delaySec * 1000)
      }
      console.info("speak****")
      window.speechSynthesis.speak(utterance)
    }

    speakOnce()
  }


  return { voices, selectedVoice, setSelectedVoice, speak }
}
