
export interface SectionItem {
  name?: string
  section?: string
  label?: string
  bars?: string
  bar?: string
  measures?: number[]
  chords?: string | string[]
  chord?: string | string[]
}

interface SectionTableProps {
  sections: SectionItem[]
}

export default function SectionTable({ sections }: SectionTableProps) {
  if (!sections || sections.length === 0) return null
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-medium text-gray-700 mb-3">段落与和弦</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium text-gray-600">段落</th>
              <th className="text-left py-2 font-medium text-gray-600">小节</th>
              <th className="text-left py-2 font-medium text-gray-600">和弦</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((sec, idx) => {
              const barStr = sec.bars || sec.bar || (sec.measures ? sec.measures[0] + '-' + sec.measures[sec.measures.length - 1] : '-')
              const chordStr = Array.isArray(sec.chords) ? sec.chords.join(' ') : (sec.chords || sec.chord || '-')
              return (
                <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 font-medium">{sec.name || sec.section || sec.label || '-'}</td>
                  <td className="py-2 text-gray-600">{barStr}</td>
                  <td className="py-2 text-gray-600">{chordStr}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
