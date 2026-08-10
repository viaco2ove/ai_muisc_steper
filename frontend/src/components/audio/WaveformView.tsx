import { useRef, useEffect, useCallback } from 'react'

interface WaveformViewProps {
  src?: string
  className?: string
  height?: number
  color?: string
}

export default function WaveformView({ src, className = '', height = 80, color = '#6366f1' }: WaveformViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const drawWaveform = useCallback(async () => {
    if (!canvasRef.current || !audioRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)

    try {
      const response = await fetch(src || '')
      const arrayBuffer = await response.arrayBuffer()
      const audioCtx = new AudioContext()
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
      const data = audioBuffer.getChannelData(0)
      const step = Math.ceil(data.length / W)
      const centre = H / 2
      ctx.fillStyle = color + '44'
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, centre)
      for (let x = 0; x < W; x++) {
        let min = 1.0, max = -1.0
        for (let j = 0; j < step; j++) {
          const datum = data[x * step + j] || 0
          if (datum < min) min = datum
          if (datum > max) max = datum
        }
        ctx.fillRect(x, centre + min * centre, 1, (max - min) * centre)
      }
      audioCtx.close()
    } catch (e) {
      // fallback: draw placeholder
      ctx.strokeStyle = '#e5e7eb'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, H / 2)
      ctx.lineTo(W, H / 2)
      ctx.stroke()
    }
  }, [src, color])

  useEffect(() => {
    if (!canvasRef.current) return
    canvasRef.current.width = canvasRef.current.parentElement?.clientWidth || 600
    if (src) drawWaveform()
  }, [src, drawWaveform])

  if (!src) {
    return (
      <div className={"border rounded p-4 text-center text-gray-400 " + className}>
        无音频波形
      </div>
    )
  }

  return (
    <div className={"border rounded overflow-hidden " + className}>
      <audio ref={(el) => { if (el) audioRef.current = el }} src={src} className="hidden" />
      <canvas
        ref={canvasRef}
        height={height}
        className="w-full cursor-pointer"
        style={{ height }}
        onClick={() => {
          if (audioRef.current) {
            if (audioRef.current.paused) audioRef.current.play()
            else audioRef.current.pause()
          }
        }}
      />
    </div>
  )
}
