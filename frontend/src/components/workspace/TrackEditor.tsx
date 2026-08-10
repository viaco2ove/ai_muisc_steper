import { useState, useEffect, useRef } from 'react'

interface TrackEditorProps {
  trackId: string
  initialMd?: string
  onSave?: (md: string) => void
  readonly?: boolean
}

export default function TrackEditor({ trackId, initialMd = '', onSave, readonly = false }: TrackEditorProps) {
  const [md, setMd] = useState(initialMd)
  const [saved, setSaved] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setMd(initialMd)
    setSaved(true)
  }, [trackId, initialMd])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMd(e.target.value)
    setSaved(false)
  }

  const handleSave = () => {
    onSave?.(md)
    setSaved(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <div className="border rounded-lg p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-700">MD编辑器 - {trackId}</h3>
        <div className="flex gap-2">
          {!saved && <span className="text-xs text-yellow-500">未保存</span>}
          {saved && <span className="text-xs text-green-500">已保存</span>}
          {!readonly && (
            <button onClick={handleSave} className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
              保存
            </button>
          )}
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={md}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        readOnly={readonly}
        className="flex-1 w-full resize-none border rounded p-3 font-mono text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
        placeholder="# 轨道信息
...

## 和弦进行
..."
      />
      <p className="text-xs text-gray-400 mt-2">Ctrl+S 保存</p>
    </div>
  )
}
