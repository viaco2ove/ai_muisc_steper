import { useEffect, useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { listProjects, getProject } from '../../services/api'
import BasicInfo from './BasicInfo'
import SectionTable from './SectionTable'
import TrackList from './TrackList'

export default function WorkspacePanel() {
  const { projects, currentProject, projectData, loadProjects, selectProject, loadProjectData } = useProjectStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listProjects()
      .then(loadProjects)
      .catch(() => {})
  }, [loadProjects])

  const handleSelectProject = async (name: string) => {
    selectProject(name)
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
  }

  const handleNewProject = () => {
    const name = prompt('输入新工程名称:')
    if (name) {
      selectProject(name)
      loadProjectData({ name })
      loadProjects([...projects, { name }])
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center gap-3 p-3 border-b bg-gray-50">
        <select
          value={currentProject || ''}
          onChange={(e) => e.target.value && handleSelectProject(e.target.value)}
          className="flex-1 border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">-- 选择工程 --</option>
          {projects.map((p) => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
        <button
          onClick={handleNewProject}
          className="px-3 py-1.5 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 transition"
        >
          新建工程
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && <div className="text-center text-gray-400 mt-10">加载中...</div>}
        {!loading && !currentProject && !projectData && (
          <div className="text-center text-gray-400 mt-10">
            <p className="text-lg">请先选择或创建工程</p>
            <p className="text-sm mt-2">使用左侧对话或上方按钮操作</p>
          </div>
        )}
        {!loading && error && <div className="text-center text-red-400 mt-10">{error}</div>}
        {!loading && projectData && <ProjectContent data={projectData} />}
      </div>
    </div>
  )
}

function ProjectContent({ data }: { data: any }) {
  const basic = data.basic || data.basic_info || data.meta || {}
  const sections = data.sections || []
  const tracks = data.tracks || []

  return (
    <div className="space-y-4">
      <BasicInfo
        bpm={basic.bpm || data.bpm}
        key={basic.key || basic.arranged_key || data.key}
        style={basic.style}
        mood={basic.mood}
        time_signature={basic.time_signature || '4/4'}
        language={basic.language}
      />
      <SectionTable sections={sections} />
      <TrackList tracks={tracks} />
    </div>
  )
}