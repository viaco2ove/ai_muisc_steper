import ChatPanel from './components/chat/ChatPanel'
import WorkspacePanel from './components/workspace/WorkspacePanel'
import { useProjectStore } from './store/projectStore'
import { useUiStore } from './store/uiStore'
import { useThemeStore } from './store/themeStore'
import { ToastProvider } from './components/common/Toast'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import ShortcutHelp from './components/common/ShortcutHelp'
import ErrorBoundary from './components/common/ErrorBoundary'
import { I18nProvider, LocaleSwitch } from './i18n'
import WsConnectionBanner from './components/common/WsConnectionBanner'
import { useState } from 'react'

const THEME_ICON: Record<string, string> = { light: '☀️', dark: '🌙', system: '🖥️' }
const THEME_NEXT: Record<string, 'light' | 'dark' | 'system'> = { light: 'dark', dark: 'system', system: 'light' }

// P4-4: 全局快捷键层（置于 ToastProvider 内，便于保存反馈走 Toast）
function GlobalShortcutLayer({ onToggleHelp }: { onToggleHelp: () => void }) {
  useGlobalShortcuts(onToggleHelp)
  return null
}

export default function App() {
  const { currentProject, wsStatus } = useProjectStore()
  const splitRatio = useUiStore((s) => s.splitRatio)
  const setSplitRatio = useUiStore((s) => s.setSplitRatio)
  const chatCollapsed = useUiStore((s) => s.chatCollapsed)
  const setChatCollapsed = useUiStore((s) => s.setChatCollapsed)
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const [showHelp, setShowHelp] = useState(false)

  const statusColor = {
    idle: 'bg-gray-400',
    connected: 'bg-green-500',
    running: 'bg-yellow-500',
  }[wsStatus]

  const statusText = {
    idle: '未连接',
    connected: '已连接',
    running: '运行中',
  }[wsStatus]

  // P4-3: 拖拽分隔条调整左右分栏比例
  const onDragStart = () => {
    const main = document.getElementById('main-split')
    if (!main) return
    const onMove = (e: MouseEvent) => {
      const rect = main.getBoundingClientRect()
      const r = ((e.clientX - rect.left) / rect.width) * 100
      setSplitRatio(r)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <ErrorBoundary level="app">
      <I18nProvider>
        <ToastProvider>
          <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
            {/* Header */}
            <header className="h-12 flex items-center justify-between px-4 bg-gray-800 text-white shrink-0">
              <div className="flex items-center gap-3">
                <h1 className="font-semibold">AI音乐工程工作台</h1>
                {currentProject && (
                  <span className="text-sm text-gray-300">| {currentProject}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${statusColor} animate-pulse`} />
                <span className="text-xs text-gray-300">{statusText}</span>
                <LocaleSwitch />
                <button
                  onClick={() => setTheme(THEME_NEXT[theme])}
                  title={`主题：${theme}（点击切换）`}
                  className="ml-1 px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm"
                >
                  {THEME_ICON[theme]}
                </button>
                <button
                  onClick={() => setChatCollapsed(!chatCollapsed)}
                  title={chatCollapsed ? '展开 AI 助手' : '折叠 AI 助手'}
                  className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm"
                >
                  {chatCollapsed ? '💬 展开' : '💬 折叠'}
                </button>
                <button
                  onClick={() => setShowHelp((v) => !v)}
                  title="快捷键帮助（?）"
                  className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm"
                >
                  ⌨️
                </button>
              </div>
            </header>

            {/* Main content: 可拖拽分栏，左聊天 / 右工作区 */}
            <main id="main-split" className="flex-1 flex min-h-0">
              {!chatCollapsed && (
                <>
                  <div
                    className="border-r min-h-0 dark:border-gray-700 overflow-hidden"
                    style={{ width: `${splitRatio}%` }}
                  >
                    <ErrorBoundary level="panel" name="对话区">
                      <ChatPanel />
                    </ErrorBoundary>
                  </div>
                  {/* 拖拽分隔条 */}
                  <div
                    onMouseDown={onDragStart}
                    title="拖拽调整分栏"
                    className="w-1.5 cursor-col-resize bg-gray-200 hover:bg-indigo-400 dark:bg-gray-700 dark:hover:bg-indigo-500 shrink-0 transition-colors"
                  />
                </>
              )}
              <div className="flex-1 min-h-0">
                <ErrorBoundary level="panel" name="工作区">
                  <WorkspacePanel />
                </ErrorBoundary>
              </div>
            </main>
            <GlobalShortcutLayer onToggleHelp={() => setShowHelp((v) => !v)} />
            <ShortcutHelp open={showHelp} onClose={() => setShowHelp(false)} />
            <WsConnectionBanner />
          </div>
        </ToastProvider>
      </I18nProvider>
    </ErrorBoundary>
  )
}