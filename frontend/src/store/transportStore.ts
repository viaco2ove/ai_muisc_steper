// 全局走带状态（P4-4）：播放/停止/回到开头。从 NoteEditor 本地状态提升为全局，
// 使 Space/Home 等快捷键可在任意位置控制播放头，PianoRoll 订阅 playBeat 渲染。
import { create } from 'zustand'

const PLAY_BPM = 68
const TOTAL_BEATS = 52 * 4

interface TransportState {
  playBeat: number | null // null = 停止；数字 = 播放头位置（拍）
  isPlaying: boolean
  toggle: () => void
  stop: () => void
  seek: (beat: number) => void
}

let rafRef: number | null = null
let lastTs = 0

function stopLoop() {
  if (rafRef != null) {
    cancelAnimationFrame(rafRef)
    rafRef = null
  }
}

function startLoop() {
  stopLoop()
  lastTs = performance.now()
  const tick = (ts: number) => {
    const dt = (ts - lastTs) / 1000
    lastTs = ts
    const cur = useTransportStore.getState().playBeat ?? 0
    let next = cur + (PLAY_BPM / 60) * dt
    if (next >= TOTAL_BEATS) next = 0
    useTransportStore.setState({ playBeat: next })
    rafRef = requestAnimationFrame(tick)
  }
  rafRef = requestAnimationFrame(tick)
}

export const useTransportStore = create<TransportState>((set, get) => ({
  playBeat: null,
  isPlaying: false,
  toggle: () => {
    const { isPlaying } = get()
    if (isPlaying) {
      stopLoop()
      set({ isPlaying: false, playBeat: null })
    } else {
      set({ isPlaying: true, playBeat: get().playBeat ?? 0 })
      startLoop()
    }
  },
  stop: () => {
    stopLoop()
    set({ isPlaying: false, playBeat: null })
  },
  seek: (beat: number) => {
    const clamped = Math.max(0, Math.min(TOTAL_BEATS, beat))
    set({ playBeat: get().isPlaying ? clamped : clamped })
  },
}))

export const TRANSPORT_TOTAL_BEATS = TOTAL_BEATS
