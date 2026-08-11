import ChatPanel from './components/chat/ChatPanel'
import WorkspacePanel from './components/workspace/WorkspacePanel'
import { useProjectStore } from './store/projectStore'
import { useThemeStore } from './store/themeStore'
import { ToastProvider } from './components/common/Toast'
import ErrorBoundary from './components/common/ErrorBoundary'

const THEME_ICON: Record<string, string> = { light: '☀️', dark: '🌙', system: '🖥️' }
const THEME_NEXT: Record<string, 'light' | 'dark' | 'system'> = { light: 'dark', dark: 'system', system: 'light' }

export default function App() {
  const { currentProject, wsStatus } = useProjectStore()
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

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

  return (
    <ErrorBoundary level="app">
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
              <button
                onClick={() => setTheme(THEME_NEXT[theme])}
                title={`主题：${theme}（点击切换）`}
                className="ml-1 px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm"
              >
                {THEME_ICON[theme]}
              </button>
            </div>
          </header>

          {/* Main content: left 40% chat, right 60% workspace */}
          <main className="flex-1 flex min-h-0">
            <div className="w-[40%] border-r min-h-0 dark:border-gray-700">
              <ErrorBoundary level="panel" name="对话区">
                <ChatPanel />
              </ErrorBoundary>
            </div>
            <div className="w-[60%] min-h-0">
              <ErrorBoundary level="panel" name="工作区">
                <WorkspacePanel />
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  )
}