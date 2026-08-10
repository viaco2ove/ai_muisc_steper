
interface BasicInfoProps {
  bpm?: string | number
  key?: string
  style?: string
  mood?: string
  time_signature?: string
  language?: string
}

export default function BasicInfo({ bpm, key, style, mood, time_signature, language }: BasicInfoProps) {
  const items = [
    { label: '调性', value: key || '-' },
    { label: 'BPM', value: bpm ? String(bpm) : '-' },
    { label: '拍号', value: time_signature || '4/4' },
    { label: '风格', value: style || '-' },
    { label: '情绪', value: mood || '-' },
    { label: '语言', value: language || '-' },
  ]
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-medium text-gray-700 mb-3">基本信息</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        {items.map(({ label, value }) => (
          <div key={label}>
            <span className="text-gray-500">{label}: </span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
