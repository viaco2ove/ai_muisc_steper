import { useState } from 'react'
import {
  MIX_TRACKS,
  SECTIONS,
  TOTAL_BARS,
  clipsForTrack,
  velocityColor,
  typeColor,
  type MixTrack,
} from '../../utils/trackModel'

interface ArrangeViewProps {
  selectedId: string | null
  onSelect: (track: MixTrack) => void
}

const barPct = (bar: number) => ((bar - 1) / TOTAL_BARS) * 100
const spanPct = (a: number, b: number) => ((b - a + 1) / TOTAL_BARS) * 100

// 时间标尺：每 4 小节一个刻度
const BAR_TICKS: number[] = []
for (let b = 1; b <= TOTAL_BARS; b += 4) BAR_TICKS.push(b)

export default function ArrangeView({ selectedId, onSelect }: ArrangeViewProps) {
  const [tracks, setTracks] = useState<MixTrack[]>(MIX_TRACKS)
  const [playhead, setPlayhead] = useState<number | null>(null) // 小节 1..52

  const anySolo = tracks.some((t) => t.solo)
  const toggleMute = (id: string) =>
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, muted: !t.muted } : t)))
  const toggleSolo = (id: string) =>
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, solo: !t.solo } : t)))

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    const bar = Math.round(pct * TOTAL_BARS) + 1
    setPlayhead(Math.max(1, Math.min(TOTAL_BARS, bar)))
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 顶栏 */}
      <div className="flex items-center gap-3 px-3 py-2 border-b bg-white shrink-0">
        <h3 className="font-medium text-gray-700">总览 · 多轨时间轴</h3>
        <span className="text-xs text-gray-400">
          {tracks.length} 轨 · {TOTAL_BARS} 小节 · {SECTIONS.length} 段
        </span>
        <span className="text-xs text-gray-400 ml-2">点击时间轴定位播放头</span>
        {playhead !== null && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded tabular-nums">
            ▶ 第 {playhead} 小节
          </span>
        )}
        <div className="ml-auto">
          <button
            onClick={() => setPlayhead(null)}
            className="text-xs px-2 py-1 border rounded hover:bg-gray-100 text-gray-600"
          >
            清除播放头
          </button>
        </div>
      </div>

      {/* 时间标尺 */}
      <div className="flex border-b bg-white shrink-0">
        <div className="w-[210px] shrink-0 border-r px-2 py-1 text-xs text-gray-400 font-medium">
          轨道 / 音色
        </div>
        <div className="flex-1 relative h-6 overflow-hidden" onClick={handleTimelineClick}>
          {SECTIONS.map((s) => (
            <div
              key={s.name}
              className="absolute top-0 h-full flex items-center justify-center text-[10px] text-gray-500 border-r border-gray-200"
              style={{ left: `${barPct(s.startBar)}%`, width: `${spanPct(s.startBar, s.endBar)}%` }}
            >
              {s.name}
            </div>
          ))}
          {BAR_TICKS.map((b) => (
            <div
              key={b}
              className="absolute top-0 h-full text-[9px] text-gray-400 border-l border-gray-200 pl-1"
              style={{ left: `${barPct(b)}%` }}
            >
              {b}
            </div>
          ))}
          {playhead !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10"
              style={{ left: `${barPct(playhead)}%` }}
            />
          )}
        </div>
      </div>

      {/* 轨道行 */}
      <div className="flex-1 overflow-auto">
        {tracks.map((t) => {
          const clips = clipsForTrack(t)
          const dimmed = anySolo && !t.solo
          const selected = selectedId === t.id
          const chipLabel = t.isSinger
            ? `🎤 ${t.museName}`
            : t.type === '打击乐'
              ? `🥁 ${t.museName}`
              : `🎸 ${t.museName || t.instrument}`
          return (
            <div
              key={t.id}
              onClick={() => onSelect(t)}
              className={[
                'flex border-b border-gray-100 cursor-pointer transition-opacity',
                selected ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : 'hover:bg-gray-100',
                t.muted ? 'opacity-50' : '',
                dimmed ? 'opacity-30' : '',
              ].join(' ')}
            >
              {/* 行头 */}
              <div className="w-[210px] shrink-0 px-2 py-1.5 flex flex-col gap-1 border-r bg-white">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleMute(t.id)
                    }}
                    className={`w-4 h-4 rounded text-[9px] font-bold ${
                      t.muted ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}
                    title="静音"
                  >
                    M
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleSolo(t.id)
                    }}
                    className={`w-4 h-4 rounded text-[9px] font-bold ${
                      t.solo ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-gray-600'
                    }`}
                    title="独奏"
                  >
                    S
                  </button>
                  <span className={`px-1 rounded text-[9px] border ${typeColor(t.type)}`}>
                    {t.type}
                  </span>
                  <span className="text-xs font-medium text-gray-800 truncate">{t.name}</span>
                </div>
                <span className="text-[10px] text-gray-400 truncate">{chipLabel}</span>
              </div>

              {/* 时间轴 clips */}
              <div className="flex-1 relative min-h-[40px] bg-gray-50" onClick={handleTimelineClick}>
                {/* 段落背景带 */}
                {SECTIONS.map((s, i) => (
                  <div
                    key={s.name}
                    className="absolute top-0 h-full border-r border-gray-200"
                    style={{
                      left: `${barPct(s.startBar)}%`,
                      width: `${spanPct(s.startBar, s.endBar)}%`,
                      background: i % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent',
                    }}
                  />
                ))}
                {/* clips */}
                {clips.map((c) => (
                  <div
                    key={c.section}
                    className="absolute top-1 bottom-1 rounded flex items-center justify-center text-[9px] text-white font-medium overflow-hidden"
                    style={{
                      left: `${barPct(c.startBar)}%`,
                      width: `${spanPct(c.startBar, c.endBar)}%`,
                      background: c.velocity > 0 ? velocityColor(c.velocity) : 'rgba(150,150,150,0.4)',
                    }}
                    title={`${c.section} · ${c.startBar}-${c.endBar} 小节 · 力度 ${c.velocity}`}
                  >
                    {spanPct(c.startBar, c.endBar) > 5 ? c.section : ''}
                  </div>
                ))}
                {/* 播放头 */}
                {playhead !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10"
                    style={{ left: `${barPct(playhead)}%` }}
                  />
                )}
                {clips.length === 0 && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-300">
                    不参与
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
