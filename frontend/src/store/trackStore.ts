// A1：轨道音符数据层（trackLoader + useTrackStore 切片）
// 真实数据由后端 `GET /api/project/{name}/track/{id}/notes` 提供；
// 接口未就绪时回退 genDemoNotes，保证纯前端可演示。后端落地后无需改 NoteEditor。
import { create } from 'zustand'
import { Note, genDemoNotes, Section, parseBeatPos, parseDuration } from '../utils/noteModel'
import { SECTIONS, MixTrack } from '../utils/trackModel'
import { getTrackNotes } from '../services/api'

function sectionsFor(track: MixTrack): Section[] {
  return SECTIONS.filter((s) => track.sections.includes(s.name)).map((s) => ({
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
  }))
}

/** 后端 notes 归一化（best-effort，字段缺失给合理默认） */
export function normalizeNotes(raw: any[]): Note[] {
  return (raw || []).map((r: any, i: number) => ({
    id: r.id ?? `n${i}`,
    midi: typeof r.midi === 'number' ? r.midi : Number(r.pitch ?? 60),
    startBeat: typeof r.startBeat === 'number' ? r.startBeat : parseBeatPos(r.beat_pos),
    durBeats: typeof r.durBeats === 'number' ? r.durBeats : parseDuration(r.duration),
    velocity: typeof r.velocity === 'number' ? r.velocity : 80,
    chord: r.chord,
    lyric: r.lyric,
    phonemes: r.phonemes,
    isRest: r.isRest,
    technique: r.technique,
    timbreUid: r.timbreUid,
    alignment: r.alignment,
    phDurs: r.phDurs,
    phOffset: r.phOffset,
    singerOverride: r.singerOverride,
  }))
}

const keyOf = (project: string, trackId: string) => `${project}::${trackId}`

export interface LoadResult {
  notes: Note[]
  source: 'backend' | 'demo'
}

/** D3/D4/D6：AI 调整的待应用快照（对话区可回滚） */
export interface PendingEdit {
  id: string
  project: string
  trackId: string
  isVocal: boolean
  before: Note[]
  after: Note[]
  message: string
  applied: boolean
  source: 'backend' | 'demo'
}

/**
 * 加载轨道音符：优先后端，失败/空 → 回退演示。
 * 同时写入 store 缓存，切换轨时秒开。
 */
export async function loadTrackNotes(project: string, track: MixTrack): Promise<LoadResult> {
  try {
    const data = await getTrackNotes(project, track.id)
    const raw = Array.isArray(data) ? data : data?.notes
    if (raw && Array.isArray(raw) && raw.length) {
      const notes = normalizeNotes(raw)
      useTrackStore.getState().setNotes(project, track.id, notes)
      return { notes, source: 'backend' }
    }
  } catch {
    // 后端 notes 接口未就绪 → 回退演示（genDemoNotes）
  }
  const notes = genDemoNotes(track.name, sectionsFor(track), track.id)
  useTrackStore.getState().setNotes(project, track.id, notes)
  return { notes, source: 'demo' }
}

interface TrackNotesState {
  byKey: Record<string, Note[]> // `${project}::${trackId}` -> notes
  version: Record<string, number> // 每次 apply/undo 自增，NoteEditor 订阅重渲染
  pending: Record<string, PendingEdit> // 待应用快照（对话区可回滚）
  setNotes: (project: string, trackId: string, notes: Note[]) => void
  stagePending: (p: PendingEdit) => void
  applyPending: (id: string) => void
  undoPending: (id: string) => void
  discardPending: (id: string) => void
}

export const useTrackStore = create<TrackNotesState>((set) => ({
  byKey: {},
  version: {},
  pending: {},
  setNotes: (project, trackId, notes) =>
    set((s) => ({ byKey: { ...s.byKey, [keyOf(project, trackId)]: notes } })),
  stagePending: (p) => set((s) => ({ pending: { ...s.pending, [p.id]: p } })),
  applyPending: (id) =>
    set((s) => {
      const p = s.pending[id]
      if (!p) return s
      const key = keyOf(p.project, p.trackId)
      return {
        byKey: { ...s.byKey, [key]: p.after },
        version: { ...s.version, [key]: (s.version[key] || 0) + 1 },
        pending: { ...s.pending, [id]: { ...p, applied: true } },
      }
    }),
  undoPending: (id) =>
    set((s) => {
      const p = s.pending[id]
      if (!p) return s
      const key = keyOf(p.project, p.trackId)
      return {
        byKey: { ...s.byKey, [key]: p.before },
        version: { ...s.version, [key]: (s.version[key] || 0) + 1 },
        pending: { ...s.pending, [id]: { ...p, applied: false } },
      }
    }),
  discardPending: (id) =>
    set((s) => {
      const next = { ...s.pending }
      delete next[id]
      return { pending: next }
    }),
}))
