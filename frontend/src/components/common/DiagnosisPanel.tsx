import { useProjectStore } from '../../store/projectStore'

export interface DiagnosisData {
  completeness?: number      // 完整性 (0-100)
  consistency?: number       // 一致性 (0-100)
  alignment?: number         // 对齐 (0-100)
  style_match?: number       // 风格契合度 (0-100)
  optimization_space?: number // 优化空间 (0-100)
  suggestions?: string[]     // 优化建议
}

interface DiagnosisItemProps {
  label: string
  value: number
  color: string
  bgColor: string
  icon: string
}

function DiagnosisItem({ label, value, color, bgColor, icon }: DiagnosisItemProps) {
  const percentage = Math.min(100, Math.max(0, value))

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-lg">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
          <span className={`text-sm font-semibold ${color}`}>{percentage}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${bgColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default function DiagnosisPanel() {
  const projectData = useProjectStore((s) => s.projectData)
  const diagnosis = (projectData as any)?.diagnosis as DiagnosisData | undefined

  if (!diagnosis) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
        <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3">五维诊断</h3>
        <p className="text-sm text-gray-400 text-center py-4">暂无诊断数据</p>
      </div>
    )
  }

  const items: DiagnosisItemProps[] = [
    {
      label: '完整性',
      value: diagnosis.completeness ?? 0,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500',
      icon: '📋',
    },
    {
      label: '一致性',
      value: diagnosis.consistency ?? 0,
      color: 'text-green-600',
      bgColor: 'bg-green-500',
      icon: '🔗',
    },
    {
      label: '对齐',
      value: diagnosis.alignment ?? 0,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500',
      icon: '⚖️',
    },
    {
      label: '风格契合度',
      value: diagnosis.style_match ?? 0,
      color: 'text-amber-600',
      bgColor: 'bg-amber-500',
      icon: '🎨',
    },
    {
      label: '优化空间',
      value: 100 - (diagnosis.optimization_space ?? 0), // 反转：优化空间越大，分数越低
      color: 'text-red-600',
      bgColor: 'bg-red-500',
      icon: '🚀',
    },
  ]

  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-700 dark:text-gray-300">五维诊断</h3>
        {diagnosis.suggestions && diagnosis.suggestions.length > 0 && (
          <span className="text-xs text-gray-400">{diagnosis.suggestions.length} 条建议</span>
        )}
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <DiagnosisItem key={item.label} {...item} />
        ))}
      </div>

      {diagnosis.suggestions && diagnosis.suggestions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">优化建议</h4>
          <ul className="space-y-1">
            {diagnosis.suggestions.map((suggestion, index) => (
              <li key={index} className="text-sm text-gray-500 dark:text-gray-400 flex items-start gap-2">
                <span className="text-blue-500 shrink-0">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
