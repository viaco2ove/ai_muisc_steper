import { useCallback } from 'react'

interface ChordVizProps {
  chordName?: string
  notes?: number[]   // MIDI note numbers
  onNoteClick?: (note: number) => void
}

// 和弦音阶：每个音高对应的MIDI (C4=60)
const NOTE_LABELS = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]
const WHITE_WIDTH = 40
const BLACK_WIDTH = 24
const WHITE_HEIGHT = 120
const BLACK_HEIGHT = 75

function midiToNoteLabel(midi: number): string {
  return NOTE_LABELS[midi % 12] + Math.floor(midi / 12 - 1)
}

function midiToColor(midi: number): string {
  // 根音/和弦音高亮
  const colors = ["bg-red-400","bg-red-500","bg-amber-400","bg-amber-500","bg-yellow-400","bg-yellow-500","bg-green-400","bg-green-500","bg-teal-400","bg-teal-500","bg-blue-400","bg-blue-500"]
  return colors[midi % 12]
}

// 生成钢琴键 SVG
function PianoSVG({ highlighted }: { highlighted: Set<number> }) {
  const whites: number[] = []
  const blacks: { note: number; x: number }[] = []
  let whiteIdx = 0
  for (let oct = 4; oct <= 5; oct++) {
    for (let n = 0; n < 12; n++) {
      const midi = oct * 12 + n
      if ([1,3,6,8,10].includes(n)) {
        blacks.push({ note: midi, x: whiteIdx * WHITE_WIDTH - BLACK_WIDTH / 2 })
      } else {
        whites.push(midi)
        whiteIdx++
      }
    }
  }
  const totalWhite = whiteIdx

  return (
    <svg width={totalWhite * WHITE_WIDTH} height={WHITE_HEIGHT} className="select-none">
      {whites.map((midi, i) => (
        <rect key={midi} x={i * WHITE_WIDTH} y={0} width={WHITE_WIDTH - 1} height={WHITE_HEIGHT}
          className={"fill-white stroke-gray-300 " + (highlighted.has(midi) ? midiToColor(midi) : 'hover:fill-gray-100')}
        />
      ))}
      {blacks.map(({ note, x }) => (
        <rect key={note} x={x} y={0} width={BLACK_WIDTH} height={BLACK_HEIGHT}
          className={"fill-gray-900 " + (highlighted.has(note) ? midiToColor(note) : 'hover:fill-gray-700')}
        />
      ))}
    </svg>
  )
}

export default function ChordViz({ chordName, notes }: ChordVizProps) {
  const highlighted = new Set(notes || [])

  const playChord = useCallback(() => {
    if (!notes || notes.length === 0) return
    try {
      const ctx = new AudioContext()
      notes.forEach((midi) => {
        const freq = 440 * Math.pow(2, (midi - 69) / 12)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.frequency.value = freq
        osc.type = 'triangle'
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 1.0)
      })
      ctx.close()
    } catch (e) {
      console.error('AudioContext failed:', e)
    }
  }, [notes])

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-700">和弦可视化</h3>
        {chordName && <span className="text-lg font-bold">{chordName}</span>}
        {notes && notes.length > 0 && (
          <button onClick={playChord} className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
            试听
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <PianoSVG highlighted={highlighted} />
      </div>
      {notes && notes.length > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          音高: {notes.map(midiToNoteLabel).join(' - ')}
        </p>
      )}
    </div>
  )
}
