import { useState, useCallback, useEffect } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { listProjects, getProject, getTrack, createProject } from '../../services/api'
import BasicInfo from './BasicInfo'
import SectionTable from './SectionTable'
import TrackList from './TrackList'
import TrackEditor from './TrackEditor'
import ChordViz from './ChordViz'
import ExportPanel from './ExportPanel'
import { chordToMidiNotes } from '../../utils/chordRender'

interface Track {
  name?: string
  role?: string
  status?: string
  instrument?: string
  timbre?: string
  id?: string
  track_id?: string
  type?: string
  [k: string]: any
}

interface Section {
  name?: string
  section?: string
  bars?: string
  chord?: string
  chords?: string | string[]
  [k: string]: any
}

export default function WorkspacePanel() {
  const { projects, currentProject, projectData, loadProjectData, loadProjects } = useProjectStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)
  const [trackMd, setTrackMd] = useState('')

  // 加载工程列表
  useEffect(() => {
    listProjects()
      .then(loadProjects)
      .catch(() => {})
  }, [loadProjects])

  const handleSelectProject = useCallback(async (name: string) => {
    setSelectedTrack(null)
    setTrackMd('')
    setLoading(true)
    setError(null)
    try {
      const data = await getProject(name)
      loadProjectData(data)
    } catch {
      setError('加载工程失败')
      loadProjectData(null)
    } finally {
      setLoading(false)
    }
  }, [loadProjectData])

  const handleSelectTrack = useCallback(async (track: Track) => {
    if (!currentProject) return
    setSelectedTrack(track)
    try {
      const tid = track.id || track.track_id || track.name || ''
      const data = await getTrack(currentProject, tid)
      setTrackMd(data.md || '')
    } catch {
      setTrackMd('')
    }
  }, [currentProject])

  const handleSave = useCallback((md: string) => {
    setTrackMd(md)
  }, [])

  // 新建工程
  const handleNewProject = useCallback(async () => {
    const name = prompt('请输入新工程名称:')
    if (!name) return
    const style = prompt('风格 (如 沙发小曲/民谣/Lo-Fi):') || ''
    const bpmStr = prompt('BPM (留空=0):') || '0'
    const bpm = parseInt(bpmStr) || 0
    const key = prompt('调性 (如 C, Eb, A):') || ''
    try {
      await createProject(name, style, bpm, key)
      const list = await listProjects()
      loadProjects(list)
      handleSelectProject(name)
      alert(`工程 "${name}" 创建成功`)
    } catch (e) {
      alert(`创建失败: ${e}`)
    }
  }, [loadProjects, handleSelectProject])

  // 数据提取
  const sections: Section[] = projectData?.sections || []
  const tracks: Track[] = projectData?.tracks || []
  const basic = (projectData as any)?.basic || (projectData as any)?.meta || {}
  const firstSec = sections[0] || {}
  const chordRaw = firstSec.chords?.[0] || firstSec.chord || ''
  const chordNotes = chordRaw ? chordToMidiNotes(chordRaw) : []
  const bpm = (projectData as any)?.bpm || basic.bpm || ''
  const key = (projectData as any)?.key || basic.key || ''
  const style = (projectData as any)?.style || basic.style || ''
  const mood = (projectData as any)?.mood || basic.mood || ''
  const timeSig = basic.time_signature || '4/4'
  const lang = (projectData as any)?.language || ''

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 工程选择栏 */}
      <div className="flex items-center gap-2 p-3 border-b bg-gray-50 shrink-0">
        <select
          value={currentProject || ''}
          onChange={(e) => e.target.value && handleSelectProject(e.target.value)}
          className="flex-1 border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">-- 选择工程 --</option>
          {projects.map((p: any) => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
        <button
          onClick={handleNewProject}
          className="px-3 py-1.5 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 transition shrink-0"
        >
          新建工程
        </button>
        {selectedTrack && (
          <button
            onClick={() => setSelectedTrack(null)}
            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600"
          >
            取消选择轨道
          </button>
        )}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && <div className="text-center text-gray-400 mt-10">加载中...</div>}
        {!loading && error && <div className="text-center text-red-400 mt-10">{error}</div>}
        {!loading && !currentProject && !projectData && (
          <div className="text-center text-gray-400 mt-10">
            <p className="text-lg">请先选择工程</p>
            <p className="text-sm mt-2">使用左侧对话或上方按钮</p>
          </div>
        )}
        {!loading && projectData && (
          <div className="space-y-4">
            {/* 基本信息 */}
            <BasicInfo
              bpm={bpm}
              key={key}
              style={style}
              mood={mood}
              time_signature={timeSig}
              language={lang}
            />

            {/* 段落与和弦表 */}
            <SectionTable sections={sections} />

            {/* 和弦钢琴预览 */}
            {chordRaw && <ChordViz chordName={chordRaw} notes={chordNotes} />}

            {/* 导出按钮 */}
            {!selectedTrack && <ExportPanel />}

            {/* 分轨列表 或 轨道编辑器 */}
            {selectedTrack ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{selectedTrack.name || selectedTrack.id || selectedTrack.track_id || ''}</span>
                  {selectedTrack.role && (
                    <span className="text-sm text-gray-500">{selectedTrack.role}</span>
                  )}
                  <StatusChip status={selectedTrack.status} />
                </div>
                <TrackEditor
                  trackId={selectedTrack.id || selectedTrack.track_id || selectedTrack.name || ''}
                  initialMd={trackMd}
                  onSave={handleSave}
                />
              </div>
            ) : (
              <TrackList
                tracks={tracks.map((t) => ({
                  name: t.name || t.track_id || t.id || '',
                  role: t.role || '',
                  status: t.status || '',
                  instrument: t.instrument || t.timbre || '',
                  timbre: t.timbre || t.instrument || '',
                  id: t.id || t.track_id || t.name || '',
                }))}
                onSelect={handleSelectTrack}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusChip({ status }: { status?: string }) {
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
    <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>
      {status || 'unknown'}
    </span>
  )
}
