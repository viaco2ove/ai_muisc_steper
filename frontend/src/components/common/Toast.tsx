import { createContext, useContext, useCallback, useRef, useState, ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'loading'

interface ToastItem {
  id: number
  type: ToastType
  message: string
}

interface ToastApi {
  show: (message: string, type?: ToastType, duration?: number) => number
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  loading: (message: string) => number
  update: (id: number, message: string, type?: ToastType, duration?: number) => void
  dismiss: (id: number) => void
}

const ToastCtx = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast 必须在 <ToastProvider> 内使用')
  return ctx
}

const COLORS: Record<ToastType, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-gray-700',
  loading: 'bg-blue-600',
}
const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  loading: '◌',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    const t = timers.current[id]
    if (t) {
      clearTimeout(t)
      delete timers.current[id]
    }
  }, [])

  const _setTimer = useCallback(
    (id: number, duration?: number) => {
      if (timers.current[id]) clearTimeout(timers.current[id])
      if (duration && duration > 0) {
        timers.current[id] = setTimeout(() => dismiss(id), duration)
      }
    },
    [dismiss],
  )

  const show = useCallback(
    (message: string, type: ToastType = 'info', duration = 3000) => {
      const id = ++seq.current
      setItems((prev) => [...prev, { id, type, message }])
      _setTimer(id, type === 'loading' ? 0 : duration)
      return id
    },
    [_setTimer],
  )

  const update = useCallback(
    (id: number, message: string, type: ToastType = 'info', duration = 3000) => {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, message, type } : i)))
      _setTimer(id, type === 'loading' ? 0 : duration)
    },
    [_setTimer],
  )

  const api: ToastApi = {
    show,
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error', 5000),
    info: (m) => show(m, 'info'),
    loading: (m) => show(m, 'loading', 0),
    update,
    dismiss,
  }

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[1000] flex flex-col gap-2 w-72 pointer-events-none">
        {items.map((it) => (
          <div
            key={it.id}
            className={`${COLORS[it.type]} text-white text-sm rounded-lg px-3 py-2 shadow-lg flex items-center gap-2 pointer-events-auto`}
          >
            <span className={it.type === 'loading' ? 'animate-spin' : ''}>{ICONS[it.type]}</span>
            <span className="flex-1 break-words">{it.message}</span>
            <button
              onClick={() => dismiss(it.id)}
              className="text-white/70 hover:text-white text-xs leading-none"
              aria-label="关闭"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
