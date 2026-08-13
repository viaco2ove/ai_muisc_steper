import { useState, useCallback, useEffect } from 'react'
import { useProjectStore } from '../../store/projectStore'
import AudioPlayer from '../audio/AudioPlayer'
import WaveformView from '../audio/WaveformView'
import { listFiles, exportProjectZip, fileUrl } from '../../services/api'

interface AudioFile {
  path: string
  type: string
  name: string
}

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
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null)
  const [exportingZip, setExportingZip] = useState(false)

  // 加载音频文件列表
  useEffect(() => {
    if (!name) return
    listFiles(name)
      .then((files: any[]) => {
        const audioExts = ['wav', 'mp3', 'ogg', 'flac']
        const audioList = files
          .filter((f: any) => audioExts.includes(f.type))
          .map((f: any) => ({
            path: f.path,
            type: f.type,
            name: f.path.split(/[/\\]/).pop() || f.path,
          }))
        setAudioFiles(audioList)
        if (audioList.length > 0 && !selectedAudio) {
          setSelectedAudio(audioList[0].path)
        }
      })
      .catch(() => setAudioFiles([]))
  }, [name, projectData])

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

  const getAudioUrl = (path: string) => {
    // 使用 fileUrl 自动拼接工程名
    return fileUrl(name, path)
  }

  const handleExportZip = async () => {
    if (!name) return
    setExportingZip(true)
    try {
      await exportProjectZip(name)
    } catch (e: any) {
      alert(`导出失败: ${e?.message || e}`)
    } finally {
      setExportingZip(false)
    }
  }

  if (!name) return null

  return (
    <div className="space-y-4">
      {/* 音频播放区 */}
      {audioFiles.length > 0 && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-medium text-gray-700 mb-3">🎵 音频播放</h3>
          <div className="flex gap-2 mb-3 flex-wrap">
            {audioFiles.map((af) => (
              <button
                key={af.path}
                onClick={() => setSelectedAudio(af.path)}
                className={`px-3 py-1.5 rounded text-sm transition ${
                  selectedAudio === af.path
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border text-gray-600 hover:bg-gray-100'
                }`}
              >
                {af.name}
              </button>
            ))}
          </div>
          {selectedAudio && (
            <div className="space-y-2">
              <AudioPlayer src={getAudioUrl(selectedAudio)} />
              <WaveformView src={getAudioUrl(selectedAudio)} height={60} />
            </div>
          )}
        </div>
      )}

      {/* 导出区 */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium text-gray-700 mb-3">📥 导出工程</h3>
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
          <button
            onClick={handleExportZip}
            disabled={exportingZip}
            className="px-3 py-1.5 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 disabled:opacity-50 transition"
          >
            {exportingZip ? '打包中...' : '📦 打包ZIP'}
          </button>
        </div>
      </div>
    </div>
  )
}
