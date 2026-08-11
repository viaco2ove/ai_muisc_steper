// D 层（LLM 协助）前端服务：优先调用后端真实 AI 接口（D5 就绪），
// 未就绪时回退本地演示启发式（清晰标注「演示」），UX 闭环一致。
// 设计对齐 like_daw §7 / like_xstudio §8：整轨调整 / 插入乐段 / 选中音符-小节 AI 调整。
import { Note } from '../utils/noteModel'

// D5 后端就绪后置 true；届时走 /api/ai/* 真实技能（ai_track_editor / ai_adjust_vocal）
const AI_BACKEND_ENABLED = true

export type AiSource = 'backend' | 'demo'

export interface AiResult {
  notes: Note[]
  source: AiSource
  message: string
}

async function postJson(url: string, body: unknown): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// —— 本地演示启发式（无 LLM，关键词解析） ——
type Heur = { kind: 'transpose' | 'velocity' | 'duration' | 'reverse' | 'noop'; value?: number }

function parseInstruction(text: string): Heur {
  const t = text.toLowerCase()
  let m = t.match(/([+-]?\d+)\s*半音/)
  if (m) return { kind: 'transpose', value: Number(m[1]) }
  if (/(升|升调|升半音|#)/.test(t)) return { kind: 'transpose', value: 2 }
  if (/(降|降调|降半音|b)/.test(t)) return { kind: 'transpose', value: -2 }
  if (/八度/.test(t)) return { kind: 'transpose', value: /降/.test(t) ? -12 : 12 }
  if (/(力度|响|重|强|轻|弱)/.test(t)) return { kind: 'velocity', value: /(轻|弱)/.test(t) ? -15 : 15 }
  if (/(拉长|延长|加长|慢)/.test(t)) return { kind: 'duration', value: 1.5 }
  if (/(缩短|加快|快|紧凑)/.test(t)) return { kind: 'duration', value: 0.66 }
  if (/(反转|倒序|翻转)/.test(t)) return { kind: 'reverse' }
  return { kind: 'noop' }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function applyHeur(notes: Note[], h: Heur): Note[] {
  switch (h.kind) {
    case 'transpose':
      return notes.map((n) => ({ ...n, midi: clamp(n.midi + (h.value ?? 0), 0, 127) }))
    case 'velocity':
      return notes.map((n) => ({ ...n, velocity: clamp(n.velocity + (h.value ?? 0), 1, 127) }))
    case 'duration': {
      const scale = h.value ?? 1
      return notes.map((n) => ({ ...n, durBeats: Math.max(0.25, n.durBeats * scale) }))
    }
    case 'reverse': {
      if (!notes.length) return notes
      const maxEnd = Math.max(...notes.map((n) => n.startBeat + n.durBeats))
      return notes
        .map((n) => ({ ...n, startBeat: maxEnd - (n.startBeat + n.durBeats) }))
        .sort((a, b) => a.startBeat - b.startBeat)
    }
    default:
      return notes
  }
}

const HEUR_LABEL: Record<Heur['kind'], string> = {
  transpose: '移调', velocity: '力度调整', duration: '时值缩放', reverse: '反转', noop: '未识别指令',
}

// ── 对外 API ──────────────────────────────────────────────

/** 整轨自然语言指令（like_daw §7.1） */
export async function requestTrackEdit(
  project: string,
  trackId: string,
  notes: Note[],
  instruction: string,
  scope = 'all',
): Promise<AiResult> {
  if (AI_BACKEND_ENABLED) {
    const data = await postJson('/api/ai/track-edit', { project, track: trackId, instruction, scope })
    const out: any = data?.skill || {}
    return {
      notes: data.notes ?? notes,
      source: 'backend',
      message: out.message || `已对${scope === 'all' ? '整轨' : scope}执行 AI 调整（${out.op || ''}）`,
    }
  }
  const h = parseInstruction(instruction)
  const next = applyHeur(notes, h)
  return {
    notes: next,
    source: 'demo',
    message: h.kind === 'noop' ? '演示模式未识别该指令（后端 D5 接入后将支持自然语言）' : `演示：已对整轨执行「${HEUR_LABEL[h.kind]}」`,
  }
}

/** 在第 afterBar 小节后插入 bars 小节乐段（like_daw §7.2） */
export async function requestInsertSection(
  project: string,
  trackId: string,
  notes: Note[],
  afterBar: number,
  bars: number,
  instruction = '',
): Promise<AiResult> {
  if (AI_BACKEND_ENABLED) {
    const data = await postJson('/api/ai/insert-section', { project, track: trackId, after_bar: afterBar, bars, instruction })
    return {
      notes: data.notes ?? notes,
      source: 'backend',
      message: `已在第 ${afterBar} 小节后插入 ${bars} 小节（后端 ai_track_editor 生成）`,
    }
  }
  const insertStart = (afterBar - 1) * 4
  const shift = bars * 4
  const shifted = notes.map((n) => (n.startBeat >= insertStart ? { ...n, startBeat: n.startBeat + shift } : n))
  const src = notes.filter((n) => n.startBeat >= insertStart - 8 && n.startBeat < insertStart)
  const copied = src.map((n, i) => ({ ...n, id: `${n.id}__ins${i}`, startBeat: n.startBeat + shift - 8 }))
  return {
    notes: [...shifted, ...copied].sort((a, b) => a.startBeat - b.startBeat),
    source: 'demo',
    message: `演示：已在第 ${afterBar} 小节后插入 ${bars} 小节（复制前段模式，后端可生成新乐思）`,
  }
}

/** 选中音符 AI 调整（like_daw §7.3 / like_xstudio §8）。
 *  indices 为空表示未选中；vocal=true 走 ai_adjust_vocal（人声演唱细节）。 */
export async function requestNoteEdit(
  project: string,
  trackId: string,
  notes: Note[],
  indices: number[],
  instruction: string,
  vocal = false,
): Promise<AiResult> {
  if (AI_BACKEND_ENABLED) {
    const data = await postJson('/api/ai/note-edit', { project, track: trackId, instruction, indices, vocal })
    return {
      notes: data.notes ?? notes,
      source: 'backend',
      message: indices.length ? `已对 ${indices.length} 个选中音符执行 AI 调整（后端 ${vocal ? 'ai_adjust_vocal' : 'ai_track_editor'}）` : '未选中任何音符',
    }
  }
  const h = parseInstruction(instruction || '移调 +0')
  const set = new Set(indices)
  const next = notes.map((n) => (set.has(notes.indexOf(n)) ? applyHeur([n], h)[0] : n))
  return {
    notes: next,
    source: 'demo',
    message: indices.length ? `演示：已对 ${indices.length} 个选中音符执行「${HEUR_LABEL[h.kind]}」` : '未选中任何音符',
  }
}

export const AI_DEMO_NOTE = `当前已接入后端 AI 技能（ai_track_editor / ai_adjust_vocal）。指令经 AgentCore 调用真实技能并写回轨道 JSON。`
