// P2-9: PromptChips 快捷指令组件
// 提供常用快捷指令：生成副歌/诊断工程/优化建议

interface Props {
  onPrompt: (prompt: string) => void
}

// 快捷指令定义
const PROMPTS = [
  {
    id: 'chorus',
    label: '生成副歌',
    icon: '🎵',
    prompt: '为当前工程生成一段副歌旋律',
    color: 'bg-pink-500 hover:bg-pink-600',
  },
  {
    id: 'diagnose',
    label: '诊断工程',
    icon: '🔍',
    prompt: '诊断当前工程的问题并给出优化建议',
    color: 'bg-blue-500 hover:bg-blue-600',
  },
  {
    id: 'suggest',
    label: '优化建议',
    icon: '💡',
    prompt: '分析当前工程并提供整体优化建议',
    color: 'bg-amber-500 hover:bg-amber-600',
  },
  {
    id: 'harmony',
    label: '添加和声',
    icon: '🎶',
    prompt: '为当前旋律轨道添加和声',
    color: 'bg-purple-500 hover:bg-purple-600',
  },
  {
    id: 'arrange',
    label: '自动编曲',
    icon: '🎹',
    prompt: '基于当前和弦进行自动编曲',
    color: 'bg-green-500 hover:bg-green-600',
  },
  {
    id: 'export',
    label: '导出工程',
    icon: '📤',
    prompt: '导出当前工程为标准格式',
    color: 'bg-gray-500 hover:bg-gray-600',
  },
]

export default function PromptChips({ onPrompt }: Props) {
  const handleClick = (prompt: string) => {
    onPrompt(prompt)
  }

  return (
    <div className="px-3 py-2 border-b bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700 flex flex-wrap gap-2">
      <span className="text-xs text-gray-400 self-center mr-1">快捷:</span>
      {PROMPTS.map((p) => (
        <button
          key={p.id}
          onClick={() => handleClick(p.prompt)}
          className={`px-2 py-1 rounded-full text-xs text-white transition ${p.color} flex items-center gap-1`}
          title={p.prompt}
        >
          <span>{p.icon}</span>
          <span>{p.label}</span>
        </button>
      ))}
    </div>
  )
}