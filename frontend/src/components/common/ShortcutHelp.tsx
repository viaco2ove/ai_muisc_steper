// P4-4: 快捷键帮助弹窗（由 `?` 或头部按钮打开）。
interface Props {
  open: boolean
  onClose: () => void
}

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: '走带',
    items: [
      ['空格', '播放 / 停止'],
      ['Home', '回到开头（停止）'],
    ],
  },
  {
    title: '编辑',
    items: [
      ['Ctrl / ⌘ + S', '保存当前轨道音符'],
      ['↑ / ↓', '选中音符音高 ±1'],
      ['← / →', '选中音符起拍 ±0.25 拍（Shift 加速）'],
      ['Del / Backspace', '删除选中音符'],
    ],
  },
  {
    title: '工作区',
    items: [
      ['Alt + 1', '工程'],
      ['Alt + 2', '分轨'],
      ['Alt + 3', '文件'],
      ['Alt + 4', '技能'],
    ],
  },
  {
    title: '界面',
    items: [
      ['?', '打开 / 关闭本帮助'],
      ['Esc', '关闭帮助'],
      ['拖拽分隔条', '调整左对话 / 右工作区分栏'],
      ['☀️/🌙/🖥️', '切换主题（浅色/深色/跟随系统）'],
    ],
  },
]

export default function ShortcutHelp({ open, onClose }: Props) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">⌨️ 快捷键</h2>
          <button
            onClick={onClose}
            className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 text-sm"
          >
            关闭 (Esc)
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="text-xs font-medium text-indigo-600 dark:text-indigo-300 mb-1">
                {g.title}
              </div>
              <div className="space-y-1">
                {g.items.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-xs">
                    <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-mono">
                      {k}
                    </kbd>
                    <span className="text-gray-500 dark:text-gray-400 flex-1 text-right ml-2">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
