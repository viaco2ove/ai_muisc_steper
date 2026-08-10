import { useRef, useEffect, useCallback } from 'react'

export interface MidiNote {
  start: number   // seconds
  end: number     // seconds
  pitch: number   // MIDI note number
  velocity?: number
  name?: string
}

interface MidiPreviewProps {
  notes?: MidiNote[]
  duration?: number
  className?: string
  height?: number
  onNoteClick?: (note: MidiNote) => void
}

export default function MidiPreview({ notes = [], duration = 10, className = '', height = 100, onNoteClick }: MidiPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const PIXELS_PER_SEC = 40
  const NOTE_HEIGHT = 12

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = Math.max(duration * PIXELS_PER_SEC, canvas.parentElement?.clientWidth || 600)
    const H = height
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, W, H)
    // background
    ctx.fillStyle = '#f9fafb'
    ctx.fillRect(0, 0, W, H)

    // piano keys on left (40px)
    const KEY_W = 40
    for (let midi = 96; midi >= 24; midi--) {
      const row = 96 - midi
      const y = row * (NOTE_HEIGHT / 2)
      const isBlack = [1,3,6,8,10].includes(midi % 12)
      ctx.fillStyle = isBlack ? '#1f2937' : '#f3f4f6'
      ctx.fillRect(0, y, isBlack ? KEY_W * 0.6 : KEY_W, NOTE_HEIGHT / 2)
    }

    // notes
    if (notes.length === 0) {
      ctx.fillStyle = '#9ca3af'
      ctx.font = '12px sans-serif'
      ctx.fillText('无 MIDI 数据', W / 2 - 30, H / 2)
      return
    }

    notes.forEach((note) => {
      const x = note.start * PIXELS_PER_SEC
      const w = Math.max((note.end - note.start) * PIXELS_PER_SEC, 2)
      const row = 96 - note.pitch
      const y = row * (NOTE_HEIGHT / 2)
      const vel = (note.velocity || 80) / 127
      ctx.fillStyle = `rgba(99, 102, 241, ${0.3 + vel * 0.5})`
      ctx.fillRect(KEY_W + x, y, w, NOTE_HEIGHT / 2)
      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 0.5
      ctx.strokeRect(KEY_W + x, y, w, NOTE_HEIGHT / 2)
    })

    // playhead
    const playhead = audioCurrentTime.current * PIXELS_PER_SEC
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(KEY_W + playhead, 0)
    ctx.lineTo(KEY_W + playhead, H)
    ctx.stroke()
  }, [notes, duration, height])

  // simple audio tracking
  const audioCurrentTime = useRef(0)
  const rafRef = useRef<number>(0)
  useEffect(() => {
    const tick = () => {
      audioCurrentTime.current = (audioCurrentTime.current || 0) + 0.05
      draw()
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [draw])

  return (
    <div className={"border rounded overflow-x-auto " + className}>
      <canvas
        ref={canvasRef}
        height={height}
        className="cursor-crosshair"
        onClick={(e) => {
          if (!canvasRef.current || !onNoteClick) return
          const rect = canvasRef.current.getBoundingClientRect()
          const x = e.clientX - rect.left - 40
          const t = x / PIXELS_PER_SEC
          const note = notes.find(n => t >= n.start && t <= n.end)
          if (note) onNoteClick(note)
        }}
      />
    </div>
  )
}
