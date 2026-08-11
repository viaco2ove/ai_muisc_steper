import { useState, useEffect, useRef } from 'react'

interface TrackEditorProps {
  trackId: string
  initialMd?: string
  onSave?: (md: string) => void | Promise<void>
  saveState?: 'idle' | 'saving' | 'saved' | 'error'
  readonly?: boolean
}

export default function TrackEditor({ trackId, initialMd = '', onSave, saveState = 'idle', readonly = false }: TrackEditorProps) {
  const [md, setMd] = useState(initialMd)
  const [saved, setSaved] = useState(true)
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setMd(initialMd)
    setSaved(true)
    setSaving(false)
  }, [trackId, initialMd])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMd(e.target.value)
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave?.(md)
      setSaved(true)
    } catch {
      setSaved(false)
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      handleSave()
    }
  }

  const badge =
    saveState === 'saving' || saving
      ? { text: '保存中…', cls: 'text-blue-500' }
      : saveState === 'error'
      ? { text: '保存失败', cls: 'text-red-500' }
      : saveState === 'saved'
      ? { text: '已保存', cls: 'text-green-500' }
      : !saved
      ? { text: '未保存', cls: 'text-yellow-500' }
      : { text: '已保存', cls: 'text-green-500' }

  return (
    <div className="border rounded-lg p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-700">MD编辑器 - {trackId}</h3>
        <div className="flex gap-2 items-center">
          <span className={`text-xs ${badge.cls}`}>{badge.text}</span>
          {!readonly && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '保存中…' : '保存'}
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
