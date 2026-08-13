import { useRef, useState, useEffect } from 'react'

interface AudioPlayerProps {
  src?: string
  className?: string
}

function fmtTime(s: number): string {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function AudioPlayer({ src, className = '' }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setCurrentTime(audio.currentTime)
    const onDur = () => setDuration(audio.duration || 0)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('durationchange', onDur)
    audio.addEventListener('loadedmetadata', onDur)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('durationchange', onDur)
      audio.removeEventListener('loadedmetadata', onDur)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [src])

  if (!src) {
    return (
      <div className={"border rounded p-4 text-center text-gray-400 " + className}>
        无音频
      </div>
    )
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = t
      setCurrentTime(t)
    }
  }

  return (
    <div className={"border rounded p-3 " + className}>
      <audio ref={audioRef} src={src} className="hidden" controls />
      {/* 时间显示 */}
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <span className="font-mono w-10 text-right">{fmtTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.01}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 accent-blue-500"
        />
        <span className="font-mono w-10">{fmtTime(duration)}</span>
        <button
          onClick={() => {
            if (audioRef.current) {
              if (isPlaying) audioRef.current.pause()
              else audioRef.current.play()
            }
          }}
          className="ml-2 px-2 py-0.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
        >
          {isPlaying ? '⏸ 暂停' : '▶ 播放'}
        </button>
      </div>
    </div>
  )
}