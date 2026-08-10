// mdParser.ts - 前端MD解析
export interface TrackInfo {
  track_id?: string; name?: string; instrument?: string;
  role?: string; status?: string; clef?: string;
  bars?: BarInfo[]; notes?: NoteInfo[]; [key: string]: any;
}
export interface BarInfo { bar: number; chord?: string; beats?: BeatInfo[] }
export interface BeatInfo { pos: string; actual?: string; dur?: string; dynamics?: string }
export interface NoteInfo { t: number; n: number; d: number; v: number; b?: number; name?: string }

export function parseTrackMd(text: string): TrackInfo {
  const result: TrackInfo = {}
  const lines = text.split('\n')
  let currentSection = ''
  for (const line of lines) {
    if (line.startsWith('## ')) { currentSection = line.slice(3).trim(); continue }
    const tableMatch = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/)
    if (tableMatch) {
      const key = tableMatch[1].trim().replace(/[*_]/g, '')
      const value = tableMatch[2].trim()
      if (currentSection === '轨道信息' || currentSection === '基本信息') (result as any)[key] = value
      continue
    }
    if (/^\d+[,;]\d+/.test(line.trim())) {
      const parts = line.split(/[,;\s]+/).map(Number).filter(n => !isNaN(n))
      if (parts.length >= 4) {
        if (!result.notes) result.notes = []
        result.notes.push({ t: parts[0], n: parts[1], d: parts[2], v: parts[3] })
      }
      continue
    }
    const barMatch = line.match(/^bar[:：]\s*(\d+)/i)
    if (barMatch) {
      if (!result.bars) result.bars = []
      result.bars.push({ bar: parseInt(barMatch[1]) })
    }
  }
  return result
}
