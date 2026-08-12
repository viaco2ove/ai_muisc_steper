import { useMemo, useState, useCallback } from 'react'
import {
  MIX_TRACKS,
  SECTIONS,
  TOTAL_BARS,
  clipsForTrack,
  velocityColor,
  typeColor,
  statusColor,
  type MixTrack,
} from '../../utils/trackModel'
import AudioPlayer from '../audio/AudioPlayer'
import { fileUrl } from '../../services/api'
import { useProjectStore } from '../../store/projectStore'

interface MixViewProps {
  selectedId: string | null
  onSelect: (track: MixTrack) => void
}

function VolSlider({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <input
      type="range"
      min={0}
      max={100}
      value={Math.round(value * 100)}
      onChange={(e) => onChange(Number(e.target.value) / 100)}
      className="w-20 accent-blue-500"
      title={`音量 ${Math.round(value * 100)}%`}
    />
  )
}

export default function MixView({ selectedId, onSelect }: MixViewProps) {
  const [tracks, setTracks] = useState<MixTrack[]>(MIX_TRACKS)
  const [master, setMaster] = useState(0.85)
  // P6-3/P6-5: 试听状态
  const [previewTrack, setPreviewTrack] = useState<string | null>(null)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [playingTracks, setPlayingTracks] = useState<Set<string>>(new Set())  // 正在播放的轨道
  const { currentProject } = useProjectStore()

  // P6-3: 试听单轨 WAV
  const handlePreview = useCallback((track: MixTrack) => {
    if (currentProject) {
      // 构造轨道音频文件路径
      const audioPath = `tracks/${track.id}.wav`
      setPreviewSrc(fileUrl(currentProject, audioPath))
      setPreviewTrack(track.id)
    }
  }, [currentProject])

  // P6-5: 联动 AudioPlayer 试听（静音/独奏切换时更新播放状态）
  // 当某轨被静音时，如果该轨正在试听则停止
  const handleMute = useCallback((trackId: string) => {
    toggleMute(trackId)
    // 如果该轨正在播放且被静音，停止播放
    if (playingTracks.has(trackId)) {
      setPlayingTracks((prev) => {
        const next = new Set(prev)
        next.delete(trackId)
        return next
      })
      if (previewTrack === trackId) {
        setPreviewSrc(null)
        setPreviewTrack(null)
      }
    }
  }, [playingTracks, previewTrack])

  const anySolo = useMemo(() => tracks.some((t) => t.solo), [tracks])

  const update = (id: string, patch: Partial<MixTrack>) =>
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))

  const toggleMute = (id: string) =>
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, muted: !t.muted } : t)))
  const toggleSolo = (id: string) =>
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, solo: !t.solo } : t)))

  const barPct = (bar: number) => ((bar - 1) / TOTAL_BARS) * 100
  const spanPct = (a: number, b: number) => ((b - a + 1) / TOTAL_BARS) * 100

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 顶部：工程名 + 主音量 */}
      <div className="flex items-center gap-3 px-3 py-2 border-b bg-white shrink-0">
        <h3 className="font-medium text-gray-700">分轨混音</h3>
        <span className="text-xs text-gray-400">{tracks.length} 轨 · 52 小节</span>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-500">主音量</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(master * 100)}
            onChange={(e) => setMaster(Number(e.target.value) / 100)}
            className="w-28 accent-gray-700"
          />
          <span className="text-xs tabular-nums w-8 text-right">{Math.round(master * 100)}</span>
        </div>
      </div>

      {/* 横向时间轴：段落标尺 */}
      <div className="flex border-b bg-white shrink-0">
        <div className="w-[300px] shrink-0 px-3 py-1 text-xs text-gray-400 font-medium">轨道 / 音色</div>
        <div className="flex-1 relative h-7 overflow-hidden">
          {SECTIONS.map((s) => (
            <div
              key={s.name}
              className="absolute top-0 h-full flex items-center justify-center text-[10px] text-gray-500 border-r border-gray-200"
              style={{ left: `${barPct(s.startBar)}%`, width: `${spanPct(s.startBar, s.endBar)}%` }}
            >
              {s.name}
            </div>
          ))}
        </div>
      </div>

      {/* 轨道 lane 列表（横向滚动） */}
      <div className="flex-1 overflow-auto">
        {tracks.map((t) => {
          const clips = clipsForTrack(t)
          const dimmed = anySolo && !t.solo
          const selected = selectedId === t.id
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
              {/* 左：控制区 */}
              <div className="w-[300px] shrink-0 px-3 py-2 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] border ${typeColor(t.type)}`}>
                    {t.type}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMute(t.id)
                    }}
                    className={`w-5 h-5 rounded text-[10px] font-bold ${
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
                    className={`w-5 h-5 rounded text-[10px] font-bold ${
                      t.solo ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-gray-600'
                    }`}
                    title="独奏"
                  >
                    S
                  </button>
                  {/* P6-3: 试听按钮 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePreview(t)
                    }}
                    className={`w-5 h-5 rounded text-[10px] font-bold ${
                      previewTrack === t.id ? 'bg-green-500 text-white animate-pulse' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    }`}
                    title="试听该轨"
                  >
                    ▶
                  </button>
                  <span className="font-medium text-sm text-gray-800 truncate">{t.name}</span>
                  <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] ${statusColor(t.status)}`}>
                    {t.status}
                  </span>
                </div>
                {/* 音色 chip */}
                <div className="flex items-center gap-1">
                  {t.isSinger ? (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 text-[11px] border border-cyan-300">
                      🎤 {t.museName || '人声'} · {t.musePack}
                    </span>
                  ) : t.type === '打击乐' ? (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[11px] border border-rose-300">
                      🥁 {t.museName || t.instrument}
                    </span>
                  ) : t.type === '歌词' ? (
                    <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[11px] border border-violet-300">
                      📝 歌词轨
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] border border-amber-300">
                      🎸 {t.museName || t.instrument}
                    </span>
                  )}
                </div>
                {/* 音量 + 力度 */}
                <div className="flex items-center gap-2">
                  <VolSlider value={t.volume} onChange={(v) => update(t.id, { volume: v })} />
                  <span className="text-[10px] tabular-nums w-7 text-right text-gray-500">
                    {Math.round(t.volume * 100)}
                  </span>
                  {/* 力度条 */}
                  <div className="flex-1 h-1.5 rounded bg-gray-200 overflow-hidden" title={`力度 ${t.velocity}`}>
                    <div
                      className="h-full"
                      style={{ width: `${(t.velocity / 127) * 100}%`, background: velocityColor(t.velocity) }}
                    />
                  </div>
                </div>
              </div>

              {/* 右：横向片段时间轴 */}
              <div className="flex-1 relative min-h-[52px] bg-gray-50">
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
                    className="absolute top-1.5 bottom-1.5 rounded flex items-center justify-center text-[10px] text-white font-medium shadow-sm overflow-hidden"
                    style={{
                      left: `${barPct(c.startBar)}%`,
                      width: `${spanPct(c.startBar, c.endBar)}%`,
                      background: c.velocity > 0 ? velocityColor(c.velocity) : 'rgba(150,150,150,0.4)',
                    }}
                    title={`${c.section} · ${c.startBar}-${c.endBar} 小节 · 力度 ${c.velocity}`}
                  >
                    {spanPct(c.startBar, c.endBar) > 6 ? c.section : ''}
                  </div>
                ))}
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

      {/* P6-3: 试听播放器 */}
      {previewSrc && (
        <div className="shrink-0 border-t bg-white p-2">
          <AudioPlayer src={previewSrc} className="bg-gray-50" />
        </div>
      )}
    </div>
  )
}
