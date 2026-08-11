import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import PianoRoll from './PianoRoll'
import AiAssistPanel from './AiAssistPanel'
import { MixTrack, SECTIONS } from '../../utils/trackModel'
import { Note, genDemoNotes, midiToName, Section, splitPhonemes, SingerOverride } from '../../utils/noteModel'
import { useToast } from '../common/Toast'
import { useProjectStore } from '../../store/projectStore'
import { useTrackStore, loadTrackNotes } from '../../store/trackStore'
import { useThemeStore } from '../../store/themeStore'
import { diffNotes } from '../../utils/noteModel'
import { saveTrackNotes } from '../../services/api'

const PLAY_BPM = 68 // 走带速度（工程「走在」=68BPM）

interface NoteEditorProps {
  track: MixTrack
}

/**
 * 逐音符编辑器（B1+B2 + C1-C5）：
 * 上 = 钢琴卷帘（拖动改音高/位置、拖右缘改时值、双击加音符）；
 * 下 = 选中音符检查器（写字段）。人声轨额外显示歌词/音素表(ph_dur)/对齐/分段/歌手配置。
 * 真实数据由后端 notes 接口（A1）提供，当前用 genDemoNotes 演示，编辑态存本地。
 */
export default function NoteEditor({ track }: NoteEditorProps) {
  const toast = useToast()

  const noteSections = useMemo<Section[]>(
    () =>
      SECTIONS.filter((s) => track.sections.includes(s.name)).map((s) => ({
        name: s.name,
        bars: [s.startBar, s.endBar] as [number, number],
        type:
          track.type === '人声' || track.type === '和声'
            ? 'vocal'
            : track.type === '打击乐'
              ? 'percussion'
              : track.id.includes('贝斯')
                ? 'bass'
                : track.id.includes('pad') || track.id.includes('垫')
                  ? 'pad'
                  : 'instrument',
      })),
    [track],
  )

  const { currentProject, addChat } = useProjectStore()
  const dark = useThemeStore((s) => s.theme === 'dark')
  const [notes, setNotes] = useState<Note[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [source, setSource] = useState<'backend' | 'demo'>('demo')
  const [selected, setSelected] = useState<Note | null>(null)
  const [singer, setSinger] = useState({
    voicebank: track.museName || '',
    tension: 0,
    breath: 0,
    gender: 0,
  })

  // A1：轨道音符加载（后端优先，失败回退演示；store 缓存秒开）
  useEffect(() => {
    let cancelled = false
    const cached = currentProject ? useTrackStore.getState().byKey[`${currentProject}::${track.id}`] : undefined
    if (cached) {
      setNotes(cached)
      setSource('backend')
      return
    }
    if (!currentProject) {
      setNotes(genDemoNotes(track.name, noteSections, track.id))
      setSource('demo')
      return
    }
    setLoadingNotes(true)
    loadTrackNotes(currentProject, track)
      .then((res) => {
        if (cancelled) return
        setNotes(res.notes)
        setSource(res.source)
      })
      .finally(() => {
        if (!cancelled) setLoadingNotes(false)
      })
    return () => {
      cancelled = true
    }
  }, [track.id, currentProject])

  // D3/D4/D6：订阅 store 版本号，预览 apply/undo 后自动重渲染
  const pendingVersion = useTrackStore((s) =>
    currentProject ? s.version[`${currentProject}::${track.id}`] || 0 : 0,
  )
  useEffect(() => {
    if (!currentProject) return
    const stored = useTrackStore.getState().byKey[`${currentProject}::${track.id}`]
    if (stored) setNotes(stored)
  }, [pendingVersion, currentProject, track.id])

  const updateNote = useCallback((id: string, patch: Partial<Note>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)))
    setSelected((s) => (s && s.id === id ? { ...s, ...patch } : s))
  }, [])

  const addNote = useCallback((note: Note) => {
    setNotes((prev) => [...prev, note])
    setSelected(note)
  }, [])

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    setSelected((s) => (s && s.id === id ? null : s))
  }, [])

  // 分段：把选中音符从中间切成两个
  const splitSelected = useCallback(() => {
    if (!selected) return
    const n = selected
    const half = n.durBeats / 2
    const a: Note = { ...n, id: n.id + '_a', durBeats: half }
    const b: Note = {
      ...n,
      id: n.id + '_b',
      startBeat: n.startBeat + half,
      durBeats: half,
    }
    if (n.phDurs && n.phDurs.length) {
      const ha = n.phDurs.map((d) => d / 2)
      a.phDurs = ha
      b.phDurs = [...ha]
    }
    setNotes((prev) => prev.flatMap((x) => (x.id === n.id ? [a, b] : [x])))
    setSelected(a)
    toast.info('已从中点分段')
  }, [selected, toast])

  // D3：AI 调整不直接落地，先暂存【预览】到对话区，可回滚应用
  const onPreview = useCallback(
    (before: Note[], after: Note[], message: string, source: 'backend' | 'demo') => {
      const diffs = diffNotes(before, after)
      if (diffs.length === 0) {
        toast.info('AI 未产生变化')
        return
      }
      const id = `pending_${Date.now()}`
      useTrackStore.getState().stagePending({
        id,
        project: currentProject || '',
        trackId: track.id,
        isVocal: track.isSinger,
        before,
        after,
        message,
        applied: false,
        source,
      })
      addChat({ role: 'tool_call', msg: message, files: [id] })
    },
    [currentProject, track.id, track.isSinger, toast, addChat],
  )

  const handleSave = useCallback(() => {
    if (!currentProject) {
      toast.info('未选择工程，编辑仅存本地')
      return
    }
    // 写 store 缓存 + 真实后端落盘（A1）
    useTrackStore.getState().setNotes(currentProject, track.id, notes)
    saveTrackNotes(currentProject, track.id, notes)
      .then(() => toast.success(`已保存 ${notes.length} 个音符到工程`))
      .catch((e: any) => toast.error(`落盘失败：${e?.message || e}（本地已暂存）`))
  }, [notes, toast, currentProject, track.id])

  // E4：走带播放头（Space 播放/停止，红竖线随拍移动）
  const [playBeat, setPlayBeat] = useState<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef<number>(0)
  const stopTransport = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    setPlayBeat(null)
  }, [])
  const togglePlay = useCallback(() => {
    if (rafRef.current != null) {
      stopTransport()
      return
    }
    lastTsRef.current = performance.now()
    const total = 52 * 4
    const tick = (ts: number) => {
      const dt = (ts - lastTsRef.current) / 1000
      lastTsRef.current = ts
      setPlayBeat((prev) => {
        const cur = prev == null ? 0 : prev
        const next = cur + (PLAY_BPM / 60) * dt
        return next >= total ? 0 : next
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [stopTransport])

  // E4：键盘快捷键（焦点在输入框时让位给文本编辑）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toUpperCase()
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (e.key === ' ' && !typing) {
        e.preventDefault()
        togglePlay()
        return
      }
      if (typing || !selected) return
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          updateNote(selected.id, { midi: Math.min(127, selected.midi + 1) })
          break
        case 'ArrowDown':
          e.preventDefault()
          updateNote(selected.id, { midi: Math.max(0, selected.midi - 1) })
          break
        case 'ArrowLeft':
          e.preventDefault()
          updateNote(selected.id, { startBeat: Math.max(0, selected.startBeat - (e.shiftKey ? 1 : 0.25)) })
          break
        case 'ArrowRight':
          e.preventDefault()
          updateNote(selected.id, { startBeat: selected.startBeat + (e.shiftKey ? 1 : 0.25) })
          break
        case 'Delete':
        case 'Backspace':
          e.preventDefault()
          deleteNote(selected.id)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, updateNote, deleteNote, togglePlay])

  // 卸载时停走带
  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <div className="flex flex-col h-full gap-2 dark:text-gray-300">
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-2">
          钢琴卷帘 · <b className="text-gray-700">{track.name}</b> · {notes.length} 音符
          {loadingNotes && <span className="text-gray-400">加载中…</span>}
          {!loadingNotes && (
            <span
              className={
                source === 'backend'
                  ? 'px-1.5 py-0.5 rounded bg-green-100 text-green-700'
                  : 'px-1.5 py-0.5 rounded bg-amber-100 text-amber-700'
              }
              title={source === 'backend' ? '来自后端 notes 接口' : '后端 notes 接口未就绪，当前为演示数据'}
            >
              {source === 'backend' ? '真实数据' : '演示数据'}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
            title="空格键播放/停止"
          >
            {playBeat == null ? '▶ 播放' : '⏸ 停止'}
          </button>
          <span className="tabular-nums text-gray-400">
            {playBeat == null ? '0.0' : playBeat.toFixed(1)} 拍
          </span>
          <span className="text-gray-400 hidden sm:inline">方向键微调 · Del 删 · 双击加 · 右键删</span>
        </span>
      </div>

      {/* D 层（LLM 协助）：整轨 / 插入乐段 / 选中音符调整 */}
      <AiAssistPanel
        project={currentProject || ''}
        trackId={track.id}
        notes={notes}
        selectedIds={selected ? [selected.id] : []}
        vocal={track.isSinger}
        onPreview={onPreview}
        onToast={(msg, kind) => (kind === 'error' ? toast.error(msg) : kind === 'success' ? toast.success(msg) : toast.info(msg))}
      />

      <PianoRoll
        notes={notes}
        totalBars={52}
        selectedId={selected?.id ?? null}
        onSelect={setSelected}
        onNoteUpdate={updateNote}
        onNoteAdd={addNote}
        onNoteDelete={deleteNote}
        playheadBeat={playBeat}
        snap={0.25}
        dark={dark}
      />

      {/* 检查器（C1-C5 写字段） */}
      <div className="border rounded-lg p-3 bg-gray-50 text-sm shrink-0 overflow-y-auto dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200" style={{ maxHeight: 240 }}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-gray-700">音符检查器</span>
          {selected && (
            <button onClick={splitSelected} className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 dark:bg-gray-700 dark:text-indigo-300 dark:hover:bg-gray-600">
              中点分段
            </button>
          )}
        </div>
        {!selected && <div className="text-gray-400 text-xs">在卷帘中点击一个音符进行编辑</div>}
        {selected && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <NumField label="音高(MIDI)" value={selected.midi} min={0} max={127} onChange={(v) => updateNote(selected.id, { midi: v })} suffix={midiToName(selected.midi)} />
              <NumField label="力度" value={selected.velocity} min={0} max={127} onChange={(v) => updateNote(selected.id, { velocity: v })} />
              <BarBeatField note={selected} onChange={(start) => updateNote(selected.id, { startBeat: start })} />
              <NumField label="时值(拍)" value={selected.durBeats} min={0.25} max={16} step={0.25} onChange={(v) => updateNote(selected.id, { durBeats: v })} />
            </div>

            {!track.isSinger && (
              <div className="grid grid-cols-2 gap-2 border-t pt-2">
                <TextField label="演奏技法" value={selected.technique || ''} placeholder="勾弦/琶音/拍弦" onChange={(v) => updateNote(selected.id, { technique: v })} />
                <TextField label="音色UID" value={selected.timbreUid || track.museUID} placeholder={track.museUID} onChange={(v) => updateNote(selected.id, { timbreUid: v })} />
              </div>
            )}

            {track.isSinger && (
              <div className="border-t pt-2 space-y-2">
                <TextField label="歌词" value={selected.lyric || ''} placeholder="单字" onChange={(v) => {
                  updateNote(selected.id, { lyric: v })
                  if (v) updateNote(selected.id, { phonemes: splitPhonemes(v) })
                }} />
                {/* 音素表 + ph_dur 占比 */}
                <div>
                  <div className="text-xs text-gray-500 mb-1">音素 / ph_dur 占比</div>
                  <div className="space-y-1">
                    {(selected.phonemes || []).map((ph, i) => {
                      const dur = selected.phDurs?.[i] ?? 1 / (selected.phonemes?.length || 1)
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="w-12 font-mono text-gray-700">{ph}</span>
                          <input
                            type="range" min={0} max={1} step={0.05}
                            value={dur}
                            onChange={(e) => {
                              const nd = [...(selected.phDurs || selected.phonemes!.map(() => 1 / selected.phonemes!.length))]
                              nd[i] = Number(e.target.value)
                              updateNote(selected.id, { phDurs: nd })
                            }}
                            className="flex-1"
                          />
                          <span className="w-10 text-right text-gray-500">{Math.round(dur * 100)}%</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    合计 {Math.round((selected.phDurs || []).reduce((a, b) => a + b, 0) * 100)}%（建议=100%，超出 X Studio 渲染错位）
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 w-12">对齐</span>
                  <select
                    value={selected.alignment || 'auto'}
                    onChange={(e) => updateNote(selected.id, { alignment: e.target.value as Note['alignment'] })}
                    className="border rounded px-2 py-1 bg-white flex-1 text-gray-900 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  >
                    <option value="auto">自动（按 openutau_lyrics 填词）</option>
                    <option value="snap">吸附</option>
                    <option value="manual">手动</option>
                  </select>
                </div>
              </div>
            )}

            {/* 歌手配置（人声轨，track 级） */}
            {track.isSinger && (
              <div className="border-t pt-2 space-y-2">
                <div className="text-xs font-medium text-gray-600">歌手配置（轨级）</div>
                <TextField label="声库" value={singer.voicebank} onChange={(v) => setSinger((s) => ({ ...s, voicebank: v }))} />
                <SliderField label="Tension" value={singer.tension} onChange={(v) => setSinger((s) => ({ ...s, tension: v }))} />
                <SliderField label="Breath" value={singer.breath} onChange={(v) => setSinger((s) => ({ ...s, breath: v }))} />
                <SliderField label="Gender" value={singer.gender} onChange={(v) => setSinger((s) => ({ ...s, gender: v }))} />
              </div>
            )}

            {/* C5：本音符歌手覆盖（单音覆盖轨级，导出 ustx 用） */}
            {track.isSinger && selected && (
              <div className="border-t pt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-purple-700">本音符歌手覆盖</span>
                  {selected.singerOverride ? (
                    <button
                      onClick={() => updateNote(selected.id, { singerOverride: undefined })}
                      className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                    >
                      清除覆盖
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        updateNote(selected.id, {
                          singerOverride: {
                            voicebank: singer.voicebank,
                            tension: singer.tension,
                            breath: singer.breath,
                            gender: singer.gender,
                          },
                        })
                      }
                      className="text-[11px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                    >
                      启用覆盖
                    </button>
                  )}
                </div>
                {selected.singerOverride && (
                  <SingerOverrideEditor
                    value={selected.singerOverride}
                    fallback={singer}
                    onChange={(patch) =>
                      updateNote(selected.id, { singerOverride: { ...selected.singerOverride!, ...patch } })
                    }
                  />
                )}
              </div>
            )}

            <button
              onClick={handleSave}
              className="w-full mt-1 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              保存音符编辑
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function NumField({ label, value, onChange, min, max, step, suffix }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500">{label}{suffix ? ` · ${suffix}` : ''}</span>
      <input
        type="number" value={value} min={min} max={max} step={step ?? 1}
        onChange={(e) => onChange(Number(e.target.value))}
        className="border rounded px-2 py-1 bg-white text-sm text-gray-900 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
      />
    </label>
  )
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500">{label}</span>
      <input
        type="text" value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="border rounded px-2 py-1 bg-white text-sm text-gray-900 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
      />
    </label>
  )
}

function SliderField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="text-gray-500 w-16">{label}</span>
      <input type="range" min={-1} max={1} step={0.05} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1" />
      <span className="w-10 text-right text-gray-500">{value.toFixed(2)}</span>
    </label>
  )
}

function BarBeatField({ note, onChange }: { note: Note; onChange: (startBeat: number) => void }) {
  const bar = Math.floor(note.startBeat / 4) + 1
  const beat = (note.startBeat % 4) + 1
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500">起拍(小节.拍)</span>
      <div className="flex items-center gap-1">
        <input
          type="number" min={1} value={bar}
          onChange={(e) => onChange((Number(e.target.value) - 1) * 4 + (beat - 1))}
          className="border rounded px-1 py-1 bg-white text-sm w-14"
        />
        <span className="text-gray-400">.</span>
        <input
          type="number" min={1} max={4} value={beat}
          onChange={(e) => onChange((bar - 1) * 4 + (Number(e.target.value) - 1))}
          className="border rounded px-1 py-1 bg-white text-sm w-14"
        />
      </div>
    </div>
  )
}

function SingerOverrideEditor({
  value,
  fallback,
  onChange,
}: {
  value: SingerOverride
  fallback: { voicebank: string; tension: number; breath: number; gender: number }
  onChange: (patch: Partial<SingerOverride>) => void
}) {
  return (
    <div className="space-y-2 bg-purple-50/50 rounded p-2">
      <TextField
        label="声库"
        value={value.voicebank ?? ''}
        placeholder={fallback.voicebank || '继承轨级'}
        onChange={(v) => onChange({ voicebank: v || undefined })}
      />
      <SliderField
        label="Tension"
        value={value.tension ?? fallback.tension}
        onChange={(v) => onChange({ tension: v })}
      />
      <SliderField
        label="Breath"
        value={value.breath ?? fallback.breath}
        onChange={(v) => onChange({ breath: v })}
      />
      <SliderField
        label="Gender"
        value={value.gender ?? fallback.gender}
        onChange={(v) => onChange({ gender: v })}
      />
      <div className="text-[11px] text-purple-500">覆盖值向下游 ustx 导出，未设字段继承轨级。</div>
    </div>
  )
}
