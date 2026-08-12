import { useEffect, useRef, useState } from 'react'
import { listSkills, type SkillInfo } from '../../services/api'

interface SkillAutocompleteProps {
  query: string
  onSelect: (skill: SkillInfo) => void
  onClose: () => void
  position?: { x: number; y: number }
}

export default function SkillAutocomplete({ query, onSelect, onClose, position }: SkillAutocompleteProps) {
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 加载技能列表
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listSkills()
      .then((list) => {
        if (!cancelled) {
          // 过滤掉 agent core 专用技能（dedicated=true）
          const visible = list.filter((s) => !(s as any).dedicated)
          setSkills(visible)
          setActiveIndex(0)
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // 过滤匹配
  const filtered = skills.filter((s) => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q)
    )
  })

  // 点击外部关闭
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [onClose])

  // 键盘导航
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[activeIndex]) {
          onSelect(filtered[activeIndex])
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [filtered, activeIndex, onSelect, onClose])

  const style = position
    ? { left: position.x, bottom: window.innerHeight - position.y }
    : {}

  return (
    <div
      ref={containerRef}
      style={style}
      className="absolute z-50 w-96 max-h-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden flex flex-col"
    >
      <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        技能 ({filtered.length})
      </div>

      {loading ? (
        <div className="p-4 text-center text-sm text-gray-400">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="p-4 text-center text-sm text-gray-400">未找到匹配的技能</div>
      ) : (
        <div className="overflow-y-auto flex-1">
          {filtered.map((skill, i) => (
            <div
              key={skill.name}
              onClick={() => onSelect(skill)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`px-3 py-2 cursor-pointer flex items-start gap-2 ${
                i === activeIndex
                  ? 'bg-blue-50 dark:bg-blue-900/30'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5 text-base text-blue-500 dark:text-blue-400">
                ⌘
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                  {skill.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                  {skill.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-3 py-1.5 text-xs text-gray-400 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        ↑↓ 选择 · Enter 确认 · Esc 取消
      </div>
    </div>
  )
}