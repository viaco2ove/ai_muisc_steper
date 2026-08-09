import { useState, useRef, useCallback } from 'react'

export function useAudioRecorder() {
  const [recording, setRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const media = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRef.current = media
      chunksRef.current = []
      media.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      media.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }
      media.start(100)
      setRecording(true)
    } catch (e) {
      console.error('getUserMedia failed:', e)
    }
  }, [])

  const stop = useCallback(() => {
    if (mediaRef.current?.state === 'recording') {
      mediaRef.current.stop()
      setRecording(false)
    }
  }, [])

  const reset = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setAudioBlob(null)
  }, [audioUrl])

  return { recording, audioUrl, audioBlob, start, stop, reset }
}
