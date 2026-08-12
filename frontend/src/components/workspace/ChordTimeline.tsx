import { useCallback, useMemo } from 'react'

export interface ChordInfo {
  chord: string
  measure?: number
  bar?: number
  duration?: number
}

interface ChordTimelineProps {
  chords?: ChordInfo[]
  currentMeasure?: number
  onChordClick?: (chord: string, index: number) => void
}

// 和弦颜色映射
const CHORD_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  // 大三和弦
  'C': { bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-300 dark:border-red-700', text: 'text-red-700 dark:text-red-300' },
  'D': { bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-300 dark:border-orange-700', text: 'text-orange-700 dark:text-orange-300' },
  'E': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-300 dark:border-yellow-700', text: 'text-yellow-700 dark:text-yellow-300' },
  'F': { bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-300 dark:border-green-700', text: 'text-green-700 dark:text-green-300' },
  'G': { bg: 'bg-teal-100 dark:bg-teal-900/30', border: 'border-teal-300 dark:border-teal-700', text: 'text-teal-700 dark:text-teal-300' },
  'A': { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-700 dark:text-blue-300' },
  'B': { bg: 'bg-indigo-100 dark:bg-indigo-900/30', border: 'border-indigo-300 dark:border-indigo-700', text: 'text-indigo-700 dark:text-indigo-300' },
  // 小三和弦
  'Cm': { bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-300 dark:border-pink-700', text: 'text-pink-700 dark:text-pink-300' },
  'Dm': { bg: 'bg-rose-100 dark:bg-rose-900/30', border: 'border-rose-300 dark:border-rose-700', text: 'text-rose-700 dark:text-rose-300' },
  'Em': { bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30', border: 'border-fuchsia-300 dark:border-fuchsia-700', text: 'text-fuchsia-700 dark:text-fuchsia-300' },
  'Fm': { bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-300 dark:border-purple-700', text: 'text-purple-700 dark:text-purple-300' },
  'Gm': { bg: 'bg-violet-100 dark:bg-violet-900/30', border: 'border-violet-300 dark:border-violet-700', text: 'text-violet-700 dark:text-violet-300' },
  'Am': { bg: 'bg-cyan-100 dark:bg-cyan-900/30', border: 'border-cyan-300 dark:border-cyan-700', text: 'text-cyan-700 dark:text-cyan-300' },
  'Bm': { bg: 'bg-sky-100 dark:bg-sky-900/30', border: 'border-sky-300 dark:border-sky-700', text: 'text-sky-700 dark:text-sky-300' },
  // 属七和弦
  'C7': { bg: 'bg-red-200 dark:bg-red-800/40', border: 'border-red-400 dark:border-red-600', text: 'text-red-800 dark:text-red-200' },
  'D7': { bg: 'bg-orange-200 dark:bg-orange-800/40', border: 'border-orange-400 dark:border-orange-600', text: 'text-orange-800 dark:text-orange-200' },
  'G7': { bg: 'bg-teal-200 dark:bg-teal-800/40', border: 'border-teal-400 dark:border-teal-600', text: 'text-teal-800 dark:text-teal-200' },
  'A7': { bg: 'bg-blue-200 dark:bg-blue-800/40', border: 'border-blue-400 dark:border-blue-600', text: 'text-blue-800 dark:text-blue-200' },
  // 其他
  'dim': { bg: 'bg-gray-200 dark:bg-gray-700/50', border: 'border-gray-400 dark:border-gray-500', text: 'text-gray-700 dark:text-gray-300' },
  'aug': { bg: 'bg-amber-200 dark:bg-amber-800/40', border: 'border-amber-400 dark:border-amber-600', text: 'text-amber-800 dark:text-amber-200' },
  'sus': { bg: 'bg-lime-100 dark:bg-lime-900/30', border: 'border-lime-300 dark:border-lime-700', text: 'text-lime-700 dark:text-lime-300' },
}

function getChordStyle(chord: string): { bg: string; border: string; text: string } {
  const base = chord.replace(/[0-9#b]/g, '').replace('maj', '').replace('min', 'm')
  const shortBase = base.slice(0, 2)
  return CHORD_COLORS[shortBase] || {
    bg: 'bg-gray-100 dark:bg-gray-700/50',
    border: 'border-gray-300 dark:border-gray-600',
    text: 'text-gray-700 dark:text-gray-300',
  }
}

function ChordBox({
  chord,
  measure,
  isActive,
  onClick,
}: {
  chord: string
  measure?: number
  isActive: boolean
  onClick?: () => void
}) {
  const style = getChordStyle(chord)

  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center
        min-w-[60px] h-16 rounded-lg border-2
        transition-all duration-200
        ${style.bg} ${style.border}
        ${isActive ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900 scale-105' : ''}
        hover:scale-105 hover:shadow-md
        cursor-pointer
      `}
    >
      <span className={`text-base font-bold ${style.text}`}>{chord}</span>
      {measure !== undefined && (
        <span className="text-[10px] text-gray-400 mt-0.5">小节 {measure}</span>
      )}
    </button>
  )
}

export default function ChordTimeline({ chords = [], currentMeasure, onChordClick }: ChordTimelineProps) {
  const handleClick = useCallback(
    (chord: string, index: number) => {
      onChordClick?.(chord, index)
    },
    [onChordClick],
  )

  // 计算小节编号
  const displayChords = useMemo(() => {
    let measureCounter = 1
    return chords.map((c, index) => {
      const measure = c.measure ?? c.bar ?? measureCounter
      if (index > 0 && chords[index - 1]) {
        const prevDuration = chords[index - 1].duration ?? 1
        measureCounter += prevDuration
      }
      return { ...c, displayMeasure: measure }
    })
  }, [chords])

  if (chords.length === 0) {
    return (
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-700 dark:text-gray-300">和弦进行</h3>
        </div>
        <p className="text-sm text-gray-400 text-center py-4">暂无和弦数据</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-700 dark:text-gray-300">和弦进行</h3>
        <span className="text-xs text-gray-400">{chords.length} 个和弦</span>
      </div>

      {/* 时间轴 */}
      <div className="relative">
        {/* 刻度线 */}
        <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-300 dark:bg-gray-600 -translate-y-1/2" />

        {/* 和弦容器 */}
        <div className="flex gap-3 overflow-x-auto pb-2 pt-1">
          {displayChords.map((chord, index) => (
            <div key={`${chord.chord}-${index}`} className="relative">
              {/* 小节标记线 */}
              {index > 0 && (
                <div className="absolute -left-1.5 top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-600" />
              )}
              <ChordBox
                chord={chord.chord}
                measure={chord.displayMeasure}
                isActive={currentMeasure !== undefined && chord.displayMeasure === currentMeasure}
                onClick={() => handleClick(chord.chord, index)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 小节刻度 */}
      <div className="mt-2 flex gap-3 overflow-x-auto">
        {displayChords.map((chord, index) => (
          <div key={`tick-${index}`} className="min-w-[60px] text-center">
            <span className="text-[10px] text-gray-400">{chord.displayMeasure}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
