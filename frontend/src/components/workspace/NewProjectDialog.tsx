import { useState, useEffect, useRef } from 'react'

interface NewProjectDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: { name: string; style?: string; bpm?: number; key?: string }) => Promise<void>
}

const STYLE_OPTIONS = [
  '流行', '摇滚', '民谣', '电子', '爵士', '古典', 'R&B', 'Hip-Hop',
  'Lo-Fi', '沙发小曲', '蓝调', '乡村', '拉丁', '新世纪', '金属', '朋克'
]

const KEY_OPTIONS = [
  'C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B',
  'Cm', 'C#m/Dbm', 'Dm', 'D#m/Ebm', 'Em', 'Fm', 'F#m/Gbm', 'Gm', 'G#m/Abm', 'Am', 'A#m/Bbm', 'Bm'
]

const BPM_PRESETS = [60, 80, 90, 100, 110, 120, 130, 140, 160, 180]

export default function NewProjectDialog({ open, onClose, onSubmit }: NewProjectDialogProps) {
  const [name, setName] = useState('')
  const [style, setStyle] = useState('')
  const [bpm, setBpm] = useState(120)
  const [key, setKey] = useState('C')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setStyle('')
      setBpm(120)
      setKey('C')
      setSubmitting(false)
      setError('')
      // 自动聚焦到名称输入框
      setTimeout(() => nameInputRef.current?.focus(), 50)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('请输入工程名称')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await onSubmit({
        name: name.trim(),
        style: style || undefined,
        bpm: bpm || undefined,
        key: key || undefined,
      })
      onClose()
    } catch (e: any) {
      setError(e?.message || '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* 弹窗 */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">新建工程</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 工程名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              工程名称 <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：我的新歌"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
              maxLength={100}
              autoComplete="off"
            />
          </div>

          {/* 风格 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              风格
            </label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">请选择风格（可选）</option>
              {STYLE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* BPM */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              BPM <span className="text-gray-400 text-xs">（拍/分钟）</span>
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={bpm}
                onChange={(e) => setBpm(Math.max(20, Math.min(300, parseInt(e.target.value) || 0)))}
                min={20}
                max={300}
                className="w-24 border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <div className="flex gap-1 flex-wrap">
                {BPM_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setBpm(p)}
                    className={`px-2 py-1 text-xs rounded ${
                      bpm === p
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 调性 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              调性
            </label>
            <select
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {KEY_OPTIONS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '创建中...' : '创建工程'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
