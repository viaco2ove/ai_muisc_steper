// 音符数据模型：解析轨道 JSON 的 notes，并生成 DAW 视图用的演示音符。
// 真实数据源：workspace/project/{歌}/song_engineer/track/{NN_轨}.json 的 notes[]
// 字段：midi(int 音高) / beat_pos("小节.拍.子拍") / duration("4分"=1拍) / velocity(0-127) / chord
// 后端 notes 接口就绪后（A1 异步 loader），用 getTrackNotes 替换 genDemoNotes 即可。

export interface Note {
  id: string
  midi: number // 0-127，音高
  startBeat: number // 从 0 起的拍数（4/4 拍）
  durBeats: number
  velocity: number // 0-127
  chord?: string
  lyric?: string // 人声：歌词字
  phonemes?: string[] // 人声：音素（CV 数组）
  isRest?: boolean // 休止（X Studio 用 R 占位）
  color?: string // 渲染色（按 velocity 计算，可覆盖）
  technique?: string // 乐器：演奏技法（如 勾弦/琶音/拍弦）
  timbreUid?: string // 乐器：音色 UID（MuseSounds）
  alignment?: 'auto' | 'snap' | 'manual' // 人声：对齐方式
  phDurs?: number[] // 人声：每个音素的时长占比（Σ=1，导出乘 note.durationMs）
  phOffset?: number // 人声：吸气口偏移（0-1，占音前）
  singerOverride?: SingerOverride // 人声：单音覆盖 track 级歌手配置（C5）
}

/** 歌手参数字段（track 级或 Note 级 override 共用） */
export interface SingerOverride {
  voicebank?: string
  tension?: number // -1~1
  breath?: number // 0~1
  gender?: number // -1~1
}

export interface Section {
  name: string
  bars: [number, number] // 含端点：1-based 小节区间
  type: 'vocal' | 'instrument' | 'percussion' | 'pad' | 'bass'
}

const DUR_MAP: Record<string, number> = {
  '1分': 4,
  '2分': 2,
  '4分': 1,
  '8分': 0.5,
  '16分': 0.25,
  '32分': 0.125,
}

/** "4分" -> 1 拍；未知返回 1 */
export function parseDuration(d: string | undefined): number {
  if (!d) return 1
  const m = d.match(/(\d+)\s*分/)
  if (m) return DUR_MAP[m[1] + '分'] ?? 1
  return 1
}

/** "1.1.1" -> 0 拍（小节.拍.子拍，子拍为半拍 0/0.5） */
export function parseBeatPos(bp: string | undefined): number {
  if (!bp) return 0
  const parts = bp.split('.').map((x) => parseInt(x, 10))
  const [bar = 1, beat = 1, sub = 1] = parts
  return (bar - 1) * 4 + (beat - 1) + (sub - 1) * 0.5
}

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export function midiToName(m: number): string {
  return NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1)
}
export function isBlackKey(m: number): boolean {
  return NAMES[((m % 12) + 12) % 12].includes('#')
}

// 简单确定性随机（让演示数据稳定，不每次刷新都变）
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TRACK_RANGE: Record<string, [number, number]> = {
  主唱: [55, 69], // G3~A4
  和声: [52, 64], // E3~E4
  吉他: [40, 64],
  节奏吉他: [40, 64],
  贝斯: [28, 43],
  轻贝斯: [28, 43],
  slap: [36, 48],
  pad: [52, 76],
  氛围垫音: [52, 76],
  泛音环境点缀: [60, 84],
  solo吉他主: [52, 79],
  solo吉他辅1: [52, 76],
}

/**
 * 由轨道的分段参与信息生成演示音符（B1 卷帘可视化用）。
 * 真实落地时由后端 notes 接口返回，此处仅作占位以保证纯前端可演示。
 */
export function genDemoNotes(trackName: string, sections: Section[], seedKey: string): Note[] {
  const rnd = mulberry32(hashStr(seedKey + trackName))
  const [lo, hi] = TRACK_RANGE[trackName] || [48, 72]
  const notes: Note[] = []
  let nid = 0
  const isVocal = trackName === '主唱' || trackName === '和声'
  const isPerc = trackName === 'slap'
  for (const s of sections) {
    if (s.type === 'pad' || s.type === 'bass') continue // pad/bass 单独处理
    for (let bar = s.bars[0]; bar <= s.bars[1]; bar++) {
      // 每小节 4 拍，按密度铺音符
      const density = isPerc ? 4 : isVocal ? 2 : rnd() > 0.4 ? 4 : 2
      for (let i = 0; i < density; i++) {
        const beat = (bar - 1) * 4 + i * (4 / density)
        const dur = (4 / density) * (rnd() > 0.7 ? 0.5 : 1)
        let midi: number
        if (isPerc) {
          midi = 38 // snare
        } else {
          midi = lo + Math.floor(rnd() * (hi - lo + 1))
        }
        const velocity = isVocal ? 48 + Math.floor(rnd() * 25) : 60 + Math.floor(rnd() * 50)
        const note: Note = {
          id: `n${nid++}`,
          midi,
          startBeat: beat,
          durBeats: dur,
          velocity,
          chord: isVocal ? 'vocal' : undefined,
        }
        if (isVocal) {
          note.lyric = ['走', '在', '路', '上', '风', '吹', '过', '夜', '色', '里'][nid % 10]
          note.phonemes = splitPhonemes(note.lyric)
          const phs = note.phonemes
          note.phDurs = phs.map(() => 1 / phs.length)
          note.alignment = 'auto'
        }
        notes.push(note)
      }
    }
  }
  if (trackName === '轻贝斯' || trackName.includes('贝斯')) {
    // 贝斯：每小节根音
    for (const s of sections) {
      for (let bar = s.bars[0]; bar <= s.bars[1]; bar++) {
        notes.push({
          id: `n${nid++}`,
          midi: 31 + Math.floor(rnd() * 5),
          startBeat: (bar - 1) * 4,
          durBeats: 2,
          velocity: 70,
        })
      }
    }
  }
  return notes
}

/** 中文单字拆成 CV 音素近似（演示用，真实由 openutau_lyrics 产出） */
export function splitPhonemes(char: string): string[] {
  const map: Record<string, string[]> = {
    走: ['z', 'ou'], 在: ['z', 'ai'], 路: ['l', 'u'], 上: ['sh', 'ang'],
    风: ['f', 'eng'], 吹: ['ch', 'ui'], 过: ['g', 'uo'], 夜: ['y', 'e'],
    色: ['s', 'e'], 里: ['l', 'i'],
  }
  return map[char] || [char]
}

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** velocity(0-127) -> 力度色：琥珀(低)→青(中)→紫(高) */
export function velocityColor(v: number): string {
  const t = Math.max(0, Math.min(1, v / 127))
  if (t < 0.5) {
    const k = t / 0.5
    return `rgb(${245 - k * 20}, ${158 + k * 40}, ${11 + k * 60})` // amber→青
  }
  const k = (t - 0.5) / 0.5
  return `rgb(${56 - k * 30}, ${189 - k * 60}, ${248 - k * 40})` // 青→紫
}

/** 量化吸附：把拍数对齐到 step 的整数倍（默认 0.25 = 16分） */
export function snapBeat(b: number, step = 0.25): number {
  return Math.round(b / step) * step
}

// ---- D3/D4/D6：AI 调整预览 —— diff + 校验 ----

export interface FieldChange {
  name: string
  from: any
  to: any
}

export interface NoteDiff {
  id: string
  kind: 'changed' | 'added' | 'removed'
  changes?: FieldChange[]
  note?: Note
}

/** 比较 before/after 两版音符，列出改变/新增/删除的音符与字段差异 */
export function diffNotes(before: Note[], after: Note[]): NoteDiff[] {
  const bMap = new Map(before.map((n) => [n.id, n]))
  const aMap = new Map(after.map((n) => [n.id, n]))
  const diffs: NoteDiff[] = []
  const fieldPairs: [string, (n: Note) => any][] = [
    ['音高', (n) => n.midi],
    ['力度', (n) => n.velocity],
    ['时值', (n) => n.durBeats],
    ['起拍', (n) => n.startBeat],
    ['歌词', (n) => n.lyric],
  ]
  for (const n of after) {
    const prev = bMap.get(n.id)
    if (!prev) {
      diffs.push({ id: n.id, kind: 'added', note: n })
      continue
    }
    const changes: FieldChange[] = []
    for (const [name, get] of fieldPairs) {
      const f = get(prev)
      const t = get(n)
      if (JSON.stringify(f) !== JSON.stringify(t)) changes.push({ name, from: f, to: t })
    }
    if (changes.length) diffs.push({ id: n.id, kind: 'changed', changes })
  }
  for (const n of before) {
    if (!aMap.has(n.id)) diffs.push({ id: n.id, kind: 'removed', note: n })
  }
  return diffs
}

export interface NoteWarn {
  level: 'warn' | 'error'
  text: string
}

/** 音符合法性校验（D6 预览校验）：范围/占比等 */
export function validateNotes(notes: Note[], isVocal = false): NoteWarn[] {
  const warns: NoteWarn[] = []
  for (const n of notes) {
    if (n.midi < 0 || n.midi > 127) warns.push({ level: 'error', text: `音符 ${n.id} 音高越界(${n.midi})` })
    if (n.velocity < 1 || n.velocity > 127) warns.push({ level: 'error', text: `音符 ${n.id} 力度越界(${n.velocity})` })
    if (n.durBeats <= 0) warns.push({ level: 'error', text: `音符 ${n.id} 时值非法(${n.durBeats})` })
    if (n.startBeat < 0) warns.push({ level: 'error', text: `音符 ${n.id} 起拍为负` })
    if (isVocal && n.phDurs && n.phDurs.length) {
      const sum = n.phDurs.reduce((a, b) => a + b, 0)
      if (Math.abs(sum - 1) > 0.05) {
        warns.push({ level: 'warn', text: `音符 ${n.id} 音素占比合计 ${(sum * 100).toFixed(0)}%（建议 100%）` })
      }
    }
  }
  return warns
}
