// 分轨混音 / 钢琴卷帘 的统一数据模型（DAW 层）
// 数据来源：workspace/project/走在/song_engineer/track/*.md + musescore.conf.json
// 这是前端归一化模型，后端接入后由 trackLoader 替换此处硬编码（见 03 组件详细设计 §四 / like_daw.md）。

export type TrackType = '乐器' | '人声' | '和声' | '打击乐' | '歌词'
export type TrackStatus = '定稿' | '草稿' | '制作中' | '不需要'

export interface SectionDef {
  name: string
  startBar: number
  endBar: number // 含
}

// 走在 · 8 段 52 小节（song_engineer.json sections + 各轨 .md 段落分配）
export const SECTIONS: SectionDef[] = [
  { name: '前奏', startBar: 1, endBar: 4 },
  { name: '主歌A', startBar: 5, endBar: 12 },
  { name: '主歌B', startBar: 13, endBar: 20 },
  { name: '间奏', startBar: 21, endBar: 24 },
  { name: '副歌', startBar: 25, endBar: 32 },
  { name: '主歌A\'', startBar: 33, endBar: 40 },
  { name: '副歌2', startBar: 41, endBar: 48 },
  { name: '尾奏', startBar: 49, endBar: 52 },
]

export const TOTAL_BARS = 52

export interface MixTrack {
  id: string
  name: string
  type: TrackType
  role: string
  status: TrackStatus
  // 音色（MuseSounds）
  instrument: string // 显示名，如 "木吉他(原声钢弦)"
  museUID: string
  museName: string // MuseSounds 音色名
  musePack: string
  isSinger: boolean // 人声轨（主唱/和声）=> 检查器显示歌词/音素/歌手配置
  // 混音
  volume: number // 0..1
  pan: number // -1..1
  velocity: number // 0..127 代表力度（用于 lane 力度条与 clip 着色）
  muted: boolean
  solo: boolean
  // 段落参与（用于横向片段时间轴的 clip 定位）
  sections: string[] // 参与的段落名；空数组 = 不参与（不渲染 clip）
  // 钢琴卷帘范围（来自 conf minPitch/maxPitch）
  minPitch: number
  maxPitch: number
  noteCount?: number
}

// 14 轨真实数据（走在工程）
export const MIX_TRACKS: MixTrack[] = [
  {
    id: '01_吉他', name: '木吉他', type: '乐器', role: '和声基底(地毯层)', status: '定稿',
    instrument: '木吉他(原声钢弦)', museUID: '13012', museName: 'Acoustic Steel Plucked', musePack: 'Muse Guitars Vol. 1',
    isSinger: false, volume: 0.7, pan: 0, velocity: 70, muted: false, solo: false,
    sections: SECTIONS.map((s) => s.name), minPitch: 40, maxPitch: 84, noteCount: 247,
  },
  {
    id: '02_主唱', name: '主唱', type: '人声', role: '主旋律线(R&B改编)', status: '定稿',
    instrument: '主唱声库', museUID: '19', museName: 'Sopranos', musePack: 'Muse Choir',
    isSinger: true, volume: 0.85, pan: 0, velocity: 72, muted: false, solo: false,
    sections: SECTIONS.map((s) => s.name), minPitch: 55, maxPitch: 81, noteCount: 304,
  },
  {
    id: '03_歌词', name: '歌词', type: '歌词', role: '段落对齐歌词', status: '草稿',
    instrument: '—', museUID: '', museName: '', musePack: '',
    isSinger: false, volume: 0, pan: 0, velocity: 0, muted: true, solo: false,
    sections: SECTIONS.map((s) => s.name), minPitch: 0, maxPitch: 0,
  },
  {
    id: '05_solo吉他主', name: 'solo吉他主', type: '乐器', role: '主solo(间奏/副歌)', status: '草稿',
    instrument: '木吉他(电,清音)', museUID: '13011', museName: 'Electric LP - Clean', musePack: 'Muse Guitars Vol. 1',
    isSinger: false, volume: 0.6, pan: 0.15, velocity: 76, muted: false, solo: false,
    sections: ['间奏', '副歌', '主歌A\'', '副歌2'], minPitch: 40, maxPitch: 84, noteCount: 31,
  },
  {
    id: '06_solo吉他辅1', name: 'solo吉他辅1', type: '乐器', role: '辅solo', status: '草稿',
    instrument: '木吉他(尼龙)', museUID: '13014', museName: 'Acoustic Nylon', musePack: 'Muse Guitars Vol. 1',
    isSinger: false, volume: 0.5, pan: -0.2, velocity: 70, muted: false, solo: false,
    sections: ['间奏', '副歌', '主歌A\'', '副歌2'], minPitch: 40, maxPitch: 84,
  },
  {
    id: '07_solo吉他辅2', name: 'solo吉他辅2', type: '乐器', role: '辅solo', status: '草稿',
    instrument: '木吉他(电,清音)', museUID: '13017', museName: 'Electric SC - Clean', musePack: 'Muse Guitars Vol. 1',
    isSinger: false, volume: 0.5, pan: 0.25, velocity: 70, muted: false, solo: false,
    sections: ['间奏', '副歌', '主歌A\'', '副歌2'], minPitch: 40, maxPitch: 84,
  },
  {
    id: '08_节奏吉他', name: '节奏吉他', type: '乐器', role: '和声节奏', status: '草稿',
    instrument: '木吉他(钢弦)', museUID: '13010', museName: 'Acoustic Nylon', musePack: 'Muse Guitars Vol. 1',
    isSinger: false, volume: 0.4, pan: 0, velocity: 55, muted: false, solo: false,
    // 间奏静音让位（.md）
    sections: ['前奏', '主歌A', '主歌B', '主歌A\'', '副歌', '副歌2', '尾奏'], minPitch: 40, maxPitch: 84, noteCount: 781,
  },
  {
    id: '09_和声', name: '和声', type: '和声', role: '人声和声(三度)', status: '定稿',
    instrument: '和声声库', museUID: '20', museName: 'Altos', musePack: 'Muse Choir',
    isSinger: true, volume: 0.5, pan: 0, velocity: 45, muted: false, solo: false,
    // 间奏/尾奏不和（.md）
    sections: ['主歌A', '主歌B', '副歌', '主歌A\'', '副歌2'], minPitch: 52, maxPitch: 79, noteCount: 120,
  },
  {
    id: '10_氛围垫音pad', name: '氛围垫音pad', type: '乐器', role: '弦乐垫底', status: '草稿',
    instrument: '弦乐垫', museUID: '92', museName: 'Violins 2', musePack: 'Muse Strings',
    isSinger: false, volume: 0.45, pan: -0.1, velocity: 50, muted: false, solo: false,
    sections: SECTIONS.map((s) => s.name), minPitch: 36, maxPitch: 96,
  },
  {
    id: '11_自然白噪音', name: '自然白噪音', type: '乐器', role: '环境噪声', status: '草稿',
    instrument: '环境层', museUID: '23', museName: 'Full Choir', musePack: 'Muse Choir',
    isSinger: false, volume: 0.35, pan: 0.05, velocity: 40, muted: false, solo: false,
    sections: SECTIONS.map((s) => s.name), minPitch: 35, maxPitch: 81,
  },
  {
    id: '12_泛音环境点缀', name: '泛音环境点缀', type: '乐器', role: '泛音点缀', status: '草稿',
    instrument: '泛音(尼龙)', museUID: '13010', museName: 'Acoustic Nylon', musePack: 'Muse Guitars Vol. 1',
    isSinger: false, volume: 0.4, pan: 0.1, velocity: 45, muted: false, solo: false,
    sections: SECTIONS.map((s) => s.name), minPitch: 40, maxPitch: 84,
  },
  {
    id: '13_轻贝斯', name: '轻贝斯', type: '乐器', role: '低频+贝斯solo', status: '定稿',
    instrument: '电贝斯', museUID: '13013', museName: 'Electric Bass', musePack: 'Muse Guitars Vol. 1',
    isSinger: false, volume: 0.7, pan: 0, velocity: 65, muted: false, solo: false,
    sections: SECTIONS.map((s) => s.name), minPitch: 28, maxPitch: 60, noteCount: 52,
  },
  {
    id: '14_slap', name: 'slap', type: '打击乐', role: '节奏吉他打击乐化', status: '定稿',
    instrument: '打击乐', museUID: '80', museName: 'Marching Tenors', musePack: 'Muse Drumline',
    isSinger: false, volume: 0.4, pan: 0, velocity: 55, muted: false, solo: false,
    sections: SECTIONS.map((s) => s.name), minPitch: 35, maxPitch: 96, noteCount: 796,
  },
]

export interface Clip {
  section: string
  startBar: number
  endBar: number
  velocity: number
}

// 计算某轨在横向时间轴上的 clip 列表（按段落参与定位）
export function clipsForTrack(track: MixTrack): Clip[] {
  return SECTIONS.filter((s) => track.sections.includes(s.name)).map((s) => ({
    section: s.name,
    startBar: s.startBar,
    endBar: s.endBar,
    velocity: track.velocity,
  }))
}

// velocity(0..127) -> 琥珀→紫色渐变（DAW 力度着色规范，like_daw.md §3）
export function velocityColor(v: number): string {
  const t = Math.max(0, Math.min(1, v / 127))
  // 琥珀 hsl(38,90%,55%) -> 紫 hsl(270,70%,55%)
  const h = 38 + t * (270 - 38)
  const s = 90 - t * 20
  const l = 55 + t * 0
  return `hsl(${h.toFixed(0)}, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`
}

export function typeColor(type: TrackType): string {
  switch (type) {
    case '人声':
      return 'bg-cyan-100 text-cyan-700 border-cyan-300'
    case '和声':
      return 'bg-teal-100 text-teal-700 border-teal-300'
    case '打击乐':
      return 'bg-rose-100 text-rose-700 border-rose-300'
    case '歌词':
      return 'bg-violet-100 text-violet-700 border-violet-300'
    default:
      return 'bg-amber-100 text-amber-700 border-amber-300'
  }
}

export function statusColor(status: TrackStatus): string {
  switch (status) {
    case '定稿':
      return 'bg-green-100 text-green-700'
    case '制作中':
      return 'bg-blue-100 text-blue-700'
    case '草稿':
      return 'bg-yellow-100 text-yellow-700'
    case '不需要':
      return 'bg-gray-200 text-gray-400'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}
