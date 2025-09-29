import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Simple wrapper de Web Speech API.
 * onResult(text, { final: boolean }) se dispara con fragmentos (interim y final).
 */
export function useSpeechToText({
  lang = 'es-ES',
  interim = true,
  continuous = false,
  onResult,
} = {}) {
  const recRef = useRef(null)
  const [supported, setSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return // no soportado
    setSupported(true)

    const rec = new SR()
    rec.lang = lang
    rec.interimResults = interim
    rec.continuous = continuous

    rec.onresult = (e) => {
      let chunk = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        chunk += e.results[i][0].transcript
      }
      onResult?.(chunk, { final: e.results[e.results.length - 1].isFinal })
    }
    rec.onerror = (ev) => setError(ev?.error || 'speech-error')
    rec.onend = () => setIsListening(false)

    recRef.current = rec
    return () => {
      try { rec.stop() } catch {}
    }
  }, [lang, interim, continuous, onResult])

  const start = useCallback(() => {
    if (!recRef.current) return
    setError(null)
    setIsListening(true)
    try { recRef.current.start() } catch {}
  }, [])

  const stop = useCallback(() => {
    try { recRef.current?.stop() } catch {}
  }, [])

  return { supported, isListening, start, stop, error }
}
