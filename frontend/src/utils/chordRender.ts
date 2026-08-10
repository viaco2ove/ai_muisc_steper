// chordRender.ts - 和弦渲染工具
export interface ChordVoicing { name: string; root: number; quality: string; notes: number[] }
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const NOTE_MAP: Record<string,number> = { 'C':0,'B#':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11,'Cb':11 }
const CHORD_FORMULAS: Record<string,number[]> = {
  '':[0,4,7],'m':[0,3,7],'maj7':[0,4,7,11],'m7':[0,3,7,10],
  '7':[0,4,7,10],'dim':[0,3,6],'aug':[0,4,8],'sus2':[0,2,7],'sus4':[0,5,7],
}
export function midiToNoteName(midi: number): string { return NOTE_NAMES[midi%12] + Math.floor(midi/12-1) }
export function noteNameToMidi(name: string, octave=4): number {
  const m = name.match(/^[A-G][#b]?/)
  if (!m) return 60; const note = NOTE_MAP[m[0]] ?? 0; return (octave+1)*12+note
}
export function parseChord(chord: string, octave=4): ChordVoicing|null {
  const m = chord.match(/^([A-G][#b]?)(.*)/)
  if (!m) return null
  const root = noteNameToMidi(m[1], octave)
  const intervals = CHORD_FORMULAS[m[2]||''] || CHORD_FORMULAS['']
  return { name: chord, root, quality: m[2], notes: intervals.map(i => root+i) }
}
export function chordToMidiNotes(chord: string, octave=4): number[] { return parseChord(chord,octave)?.notes||[] }
