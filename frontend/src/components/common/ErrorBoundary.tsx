import { Component, ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  level?: 'app' | 'panel' | 'card'
  name?: string // 出错时展示的面板名
  onReset?: () => void
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.level}]`, this.props.name, error, info.componentStack)
  }

  handleReload = () => {
    this.setState({ error: null })
    this.props.onReset?.()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const { level = 'card', name = '面板' } = this.props

    if (level === 'app') {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white gap-4 p-8">
          <h1 className="text-xl font-semibold">应用出错了</h1>
          <pre className="text-left text-sm text-red-300 bg-black/40 rounded p-4 max-w-2xl overflow-auto max-h-64">
            {error.message}
          </pre>
          <button
            onClick={() => location.reload()}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            重新加载
          </button>
        </div>
      )
    }

    if (level === 'panel') {
      return (
        <div className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="text-3xl">⚠️</div>
          <h2 className="font-medium text-gray-700">{name} 加载失败</h2>
          <p className="text-sm text-red-500 max-w-md break-words">{error.message}</p>
          <div className="flex gap-2">
            <button
              onClick={this.handleReload}
              className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              重载此面板
            </button>
            <button
              onClick={() => navigator.clipboard?.writeText(error.message)}
              className="px-3 py-1.5 border rounded text-sm text-gray-600 hover:bg-gray-50"
            >
              复制诊断信息
            </button>
          </div>
        </div>
      )
    }

    // card 级：只塌陷单个卡片，不影响其他
    return (
      <div className="border border-red-200 bg-red-50 rounded-lg p-3 text-sm text-red-600">
        <div className="flex items-center justify-between">
          <span>⚠️ {name} 渲染失败</span>
          <button onClick={this.handleReload} className="underline text-red-500">
            重试
          </button>
        </div>
        <p className="mt-1 text-xs text-red-400 break-words">{error.message}</p>
      </div>
    )
  }
}
