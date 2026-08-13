// LyricsPanel.tsx - 人声轨道歌词编辑面板
import { useState, useEffect } from 'react'
import { listFiles, fileUrl } from '../../services/api'

interface LyricsPanelProps {
  projectName: string
  trackId: string
}

export default function LyricsPanel({ projectName, trackId }: LyricsPanelProps) {
  const [lyrics, setLyrics] = useState('')
  const [saved, setSaved] = useState(true)
  const [audioFiles, setAudioFiles] = useState<{ name: string; url: string }[]>([])
  const [activeAudio, setActiveAudio] = useState<string | null>(null)

  useEffect(() => {
    if (!projectName) return
    setLyrics('')
    // 加载工程音频文件
    listFiles(projectName)
      .then((files: any[]) => {
        const audio = files.filter((f) => ['wav', 'mp3'].includes(f.type))
        const list = audio.map((f) => ({
          name: f.path.split(/[/\\]/).pop(),
          url: fileUrl(projectName, f.path),
        }))
        setAudioFiles(list)
        if (list.length > 0 && list.some((a) => a.name?.startsWith(trackId))) {
          const t = list.find((a) => a.name?.startsWith(trackId))
          if (t) setActiveAudio(t.url)
        } else if (list.length > 0) {
          setActiveAudio(list[0].url)
        }
      })
      .catch(console.error)
  }, [projectName, trackId])

  const handleChange = (v: string) => {
    setLyrics(v)
    setSaved(false)
  }

  const handleSave = async () => {
    // 保存为 03_lyrics.txt 或在 track.json 中
    try {
      await fetch(`/api/project/${encodeURIComponent(projectName)}/file?path=song_engineer/track/${encodeURIComponent(trackId)}.lyrics.txt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: lyrics }),
      })
      setSaved(true)
    } catch (e) {
      console.error('Save lyrics failed:', e)
    }
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-700 dark:text-gray-200">📝 歌词编辑 - {trackId}</h3>
        <span className={`text-xs ${saved ? 'text-green-500' : 'text-yellow-500'}`}>
          {saved ? '已保存' : '未保存'}
        </span>
      </div>

      {/* 关联音频预览 */}
      {audioFiles.length > 0 && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">关联音频</label>
          <div className="flex gap-1 flex-wrap mb-2">
            {audioFiles.map((af) => (
              <button
                key={af.url}
                onClick={() => setActiveAudio(af.url)}
                className={`px-2 py-0.5 text-xs rounded ${
                  activeAudio === af.url
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {af.name}
              </button>
            ))}
          </div>
          {activeAudio && (
            <audio controls src={activeAudio} className="w-full h-8" />
          )}
        </div>
      )}

      {/* 歌词文本编辑（按行对应段落） */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">
          歌词（一行一句，# 段落分隔）
        </label>
        <textarea
          value={lyrics}
          onChange={(e) => handleChange(e.target.value)}
          rows={8}
          placeholder={'# 主歌 A\n走进这条小巷\n那段回忆还在\n# 副歌\n...'}
          className="w-full px-2 py-1 text-sm border rounded font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saved}
        className="w-full px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
      >
        💾 保存歌词
      </button>

      <div className="text-xs text-gray-400 border-t pt-2">
        💡 提示：每行一个字或一个词，# 表示段落分隔，与 song_engineer/track/*.json 同步
      </div>
    </div>
  )
}