
export interface TrackItem {
  name?: string
  role?: string
  status?: string
  instrument?: string
  type?: string
  timbre?: string
  id?: string
}

interface TrackListProps {
  tracks: TrackItem[]
  onSelect?: (track: TrackItem) => void
}

function StatusBadge({ status }: { status?: string }) {
  const colors: Record<string, string> = {
    done: 'bg-green-100 text-green-700',
    '定稿': 'bg-green-100 text-green-700',
    running: 'bg-blue-100 text-blue-700',
    '制作中': 'bg-blue-100 text-blue-700',
    pending: 'bg-yellow-100 text-yellow-700',
    '草稿': 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
    '错误': 'bg-red-100 text-red-700',
  }
  const cls = colors[status || ''] || 'bg-gray-100 text-gray-600'
  return (
    <span className={"px-2 py-0.5 rounded text-xs " + cls}>
      {status || 'unknown'}
    </span>
  )
}

export default function TrackList({ tracks, onSelect }: TrackListProps) {
  if (!tracks || tracks.length === 0) return null
  const rowCls = onSelect ? 'cursor-pointer hover:bg-blue-50' : ''
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-medium text-gray-700 mb-3">分轨列表</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium text-gray-600">名称</th>
              <th className="text-left py-2 font-medium text-gray-600">角色</th>
              <th className="text-left py-2 font-medium text-gray-600">音色</th>
              <th className="text-left py-2 font-medium text-gray-600">状态</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((track, idx) => (
              <tr
                key={idx}
                className={"border-b last:border-0 " + rowCls}
                onClick={() => onSelect?.(track)}
              >
                <td className="py-2 font-medium">{track.name || track.id || '-'}</td>
                <td className="py-2 text-gray-600">{track.role || '-'}</td>
                <td className="py-2 text-gray-600">{track.instrument || track.timbre || '-'}</td>
                <td className="py-2"><StatusBadge status={track.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
