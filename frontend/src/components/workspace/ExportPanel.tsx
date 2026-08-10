import { useState, useCallback } from 'react'
import { useProjectStore } from '../../store/projectStore'

const TYPES = [
  { label: 'MIDI', ext: 'mid', mime: 'audio/midi' },
  { label: 'WAV', ext: 'wav', mime: 'audio/wav' },
  { label: 'MSCX乐谱', ext: 'mscx', mime: 'application/octet-stream' },
  { label: '歌词TXT', ext: 'lyrics.txt', mime: 'text/plain' },
]

export default function ExportPanel({ project }: { project?: string }) {
  const { projectData } = useProjectStore()
  const name = project || (projectData as any)?.meta?.song_name || (projectData as any)?.name || ''
  const [downloading, setDownloading] = useState<string | null>(null)

  const handleExport = useCallback(async (ext: string) => {
    if (!name) return
    setDownloading(ext)
    try {
      const r = await fetch(`/api/export/${encodeURIComponent(name)}/${ext.replace('/', '')}`)
      if (r.ok) {
        const blob = await r.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const fname = r.headers.get('Content-Disposition')?.match(/filename[^;=\n]*=((['"]).*?\1|[^;\n]*)/)?.[1] || `${name}.${ext}`
        a.download = fname
        a.click()
        URL.revokeObjectURL(url)
      } else {
        alert(`导出失败: ${r.status}`)
      }
    } catch (e) {
      alert(`导出出错: ${e}`)
    } finally {
      setDownloading(null)
    }
  }, [name])

  if (!name) return null

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-medium text-gray-700 mb-3">导出</h3>
      <div className="flex flex-wrap gap-2">
        {TYPES.map(({ label, ext }) => (
          <button
            key={ext}
            onClick={() => handleExport(ext)}
            disabled={!!downloading}
            className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50 transition"
          >
            {downloading === ext ? '导出中...' : label}
          </button>
        ))}
      </div>
    </div>
  )
}
