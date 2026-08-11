// E5：主题状态（light / dark / system），持久化到 localStorage 并即时应用到 <html>。
import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'

const KEY = 'daw-theme'

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

function isDark(mode: ThemeMode): boolean {
  return mode === 'dark' || (mode === 'system' && systemPrefersDark())
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', isDark(mode))
}

interface ThemeState {
  theme: ThemeMode
  setTheme: (t: ThemeMode) => void
}

function initial(): ThemeMode {
  if (typeof localStorage === 'undefined') return 'light'
  const v = localStorage.getItem(KEY) as ThemeMode | null
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'light'
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initial(),
  setTheme: (t) => {
    try {
      localStorage.setItem(KEY, t)
    } catch {
      /* ignore */
    }
    applyTheme(t)
    set({ theme: t })
  },
}))

// 首次加载即应用
if (typeof window !== 'undefined') {
  applyTheme(useThemeStore.getState().theme)
  // 跟随系统主题变化（仅 system 模式需要，统一监听简单）
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useThemeStore.getState().theme === 'system') applyTheme('system')
  })
}
