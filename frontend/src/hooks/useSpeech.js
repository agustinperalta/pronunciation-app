import { useState, useEffect, useRef, useCallback } from 'react'

export function useSpeech() {
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentWord, setCurrentWord] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)

  const stopRef = useRef(false)
  const jumpToRef = useRef(null)
  const startTimeRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    const load = () => {
      const all = window.speechSynthesis.getVoices()
      const en = all.filter(v => v.lang.startsWith('en'))
      setVoices(en)
      if (en.length > 0 && !selectedVoice) {
        const pref = en.find(v =>
          v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Google US')
        )
        setSelectedVoice(pref || en[0])
      }
    }
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => { window.speechSynthesis.onvoiceschanged = null }
  }, [])

  const speak = useCallback((word, voice) => {
    return new Promise(resolve => {
      window.speechSynthesis.cancel()
      const utt = new SpeechSynthesisUtterance(word)
      if (voice) { utt.voice = voice; utt.lang = voice.lang }
      else utt.lang = 'en-US'
      utt.rate = 0.85
      utt.onend = resolve
      utt.onerror = resolve
      window.speechSynthesis.speak(utt)
    })
  }, [])

  const startLoop = useCallback(async ({ words, durationMinutes, pauseSeconds, voice }) => {
    if (!words || words.length === 0) return
    stopRef.current = false
    jumpToRef.current = null
    setIsPlaying(true)
    setProgress(0)
    setCurrentIndex(0)

    const totalMs = durationMinutes * 60 * 1000
    startTimeRef.current = Date.now()
    setTimeLeft(totalMs)

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const pct = Math.min((elapsed / totalMs) * 100, 100)
      setProgress(pct)
      setTimeLeft(Math.max(totalMs - elapsed, 0))
    }, 300)

    let idx = 0
    while (!stopRef.current) {
      if (jumpToRef.current !== null) {
        idx = jumpToRef.current
        jumpToRef.current = null
      }

      const elapsed = Date.now() - startTimeRef.current
      if (elapsed >= totalMs) break

      const word = words[idx % words.length]
      setCurrentWord(word)
      setCurrentIndex(idx % words.length)
      await speak(word, voice)
      if (stopRef.current) break

      await new Promise(r => {
        const t = setTimeout(r, pauseSeconds * 1000)
        const check = setInterval(() => {
          if (stopRef.current || jumpToRef.current !== null) { clearTimeout(t); clearInterval(check); r() }
        }, 100)
        setTimeout(() => clearInterval(check), pauseSeconds * 1000 + 200)
      })
      idx++
    }

    clearInterval(timerRef.current)
    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setCurrentWord(null)
    setProgress(0)
    setTimeLeft(0)
  }, [speak])

  const stopLoop = useCallback(() => {
    stopRef.current = true
    clearInterval(timerRef.current)
    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setCurrentWord(null)
    setProgress(0)
    setTimeLeft(0)
  }, [])

  const jumpTo = useCallback((index) => {
    jumpToRef.current = index
    window.speechSynthesis.cancel()
  }, [])

  const speakOnce = useCallback((word) => {
    speak(word, selectedVoice)
  }, [speak, selectedVoice])

  return {
    voices, selectedVoice, setSelectedVoice,
    isPlaying, currentWord, currentIndex,
    progress, timeLeft,
    startLoop, stopLoop, jumpTo, speakOnce,
  }
}
