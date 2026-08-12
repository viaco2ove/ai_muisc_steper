import { useState, useCallback, useEffect } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useUiStore } from '../../store/uiStore'
import { useToast } from '../common/Toast'
import { listProjects, getProject, getTrack, createProject, saveTrack, deleteProject, renameProject, copyProject, createTrack, deleteTrack, reorderTrack } from '../../services/api'
import BasicInfo from './BasicInfo'
import SectionTable from './SectionTable'
import TrackEditor from './TrackEditor'
import ChordViz from './ChordViz'
import ExportPanel from './ExportPanel'
import MixView from './MixView'
import ArrangeView from './ArrangeView'
import NoteEditor from './NoteEditor'
import FileBrowser from './FileBrowser'
import SkillPanel from './SkillPanel'
import NewProjectDialog from './NewProjectDialog'
import { chordToMidiNotes } from '../../utils/chordRender'
import { MIX_TRACKS, type MixTrack } from '../../utils/trackModel'

interface Section {
  name?: string
  section?: string
  bars?: string
  chord?: string
  chords?: string | string[]
  [k: string]: any
}

const TABS = ['工程', '分轨', '文件', '技能'] as const

export default function WorkspacePanel() {
  const { projects, currentProject, projectData, loadProjectData, loadProjects, selectProject } = useProjectStore()
  const { activeTab, setActiveTab, selectedTrackId, setSelectedTrackId } = useUiStore()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trackMd, setTrackMd] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [mixView, setMixView] = useState<'mix' | 'arrange'>('mix')
  // 轨道排序状态（存储轨道ID顺序）
  const [trackOrder, setTrackOrder] = useState<string[]>(MIX_TRACKS.map((t) => t.id))
  // 新建工程对话框状态
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false)

  useEffect(() => {
    listProjects()
      .then(loadProjects)
      .catch(() => {})
  }, [loadProjects])

  const handleSelectProject = useCallback(
    async (name: string) => {
      selectProject(name) // P0-1: 写入 currentProject
      setSelectedTrackId(null)
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
    },
    [loadProjectData, selectProject, setSelectedTrackId],
  )

  // 分轨 Tab：MixView lane 点击
  const handleSelectMixTrack = useCallback(
    async (mt: MixTrack) => {
      if (!currentProject) {
        toast.info('请先选择工程')
        return
      }
      setSelectedTrackId(mt.id)
      setSaveState('idle')
      try {
        const data = await getTrack(currentProject, mt.id)
        setTrackMd(data.md || '')
      } catch {
        setTrackMd('')
      }
    },
    [currentProject, setSelectedTrackId, toast],
  )

  const handleSave = useCallback(
    async (md: string) => {
      setTrackMd(md)
      const tid = selectedTrackId
      if (!currentProject || !tid) {
        setSaveState('saved')
        return
      }
      setSaveState('saving')
      try {
        await saveTrack(currentProject, tid, md) // P0-3: 真正持久化
        setSaveState('saved')
        toast.success(`已保存 ${tid}`)
      } catch (e: any) {
        setSaveState('error')
        toast.error(`保存失败：${e?.message || e}`)
      }
    },
    [currentProject, selectedTrackId, toast],
  )

  const handleNewProject = useCallback(async () => {
    setShowNewProjectDialog(true)
  }, [])

  const handleNewProjectSubmit = useCallback(async (data: { name: string; style?: string; bpm?: number; key?: string }) => {
    try {
      await createProject(data.name, data.style, data.bpm, data.key)
      const list = await listProjects()
      loadProjects(list)
      handleSelectProject(data.name)
      toast.success(`工程 "${data.name}" 创建成功`)
    } catch (e: any) {
      toast.error(`创建失败：${e?.message || e}`)
      throw e
    }
  }, [loadProjects, handleSelectProject, toast])

  const handleDeleteProject = useCallback(async (name: string) => {
    if (!confirm(`确定要删除工程 "${name}" 吗？此操作不可恢复！`)) return
    try {
      await deleteProject(name)
      const list = await listProjects()
      loadProjects(list)
      if (currentProject === name) {
        selectProject(null)
      }
      toast.success(`已删除工程: ${name}`)
    } catch (e: any) {
      toast.error(`删除失败：${e?.message || e}`)
    }
  }, [currentProject, loadProjects, selectProject, toast])

  const handleRenameProject = useCallback(async (name: string) => {
    const newName = prompt(`将工程 "${name}" 重命名为:`, name)
    if (!newName || newName === name) return
    try {
      await renameProject(name, newName)
      const list = await listProjects()
      loadProjects(list)
      selectProject(newName)
      toast.success(`已重命名为: ${newName}`)
    } catch (e: any) {
      toast.error(`重命名失败：${e?.message || e}`)
    }
  }, [currentProject, loadProjects, selectProject, toast])

  const handleCopyProject = useCallback(async (name: string) => {
    const newName = prompt(`复制工程 "${name}" 为:`, `${name}_copy`)
    if (!newName || newName === name) return
    try {
      await copyProject(name, newName)
      const list = await listProjects()
      loadProjects(list)
      toast.success(`已复制为: ${newName}`)
    } catch (e: any) {
      toast.error(`复制失败：${e?.message || e}`)
    }
  }, [loadProjects, toast])

  const handleAddTrack = useCallback(async () => {
    if (!currentProject) {
      toast.info('请先选择工程')
      return
    }
    const name = prompt('轨道名称:')
    if (!name) return
    const type = prompt('轨道类型 (乐器/人声/和声/打击乐/歌词):', '乐器') || '乐器'
    const role = prompt('轨道角色/职责:', '') || ''
    try {
      await createTrack(currentProject, { id: name, name, type, role, instrument: '' })
      toast.success(`已添加轨道: ${name}`)
    } catch (e: any) {
      toast.error(`添加失败：${e?.message || e}`)
    }
  }, [currentProject, toast])

  const handleDeleteTrack = useCallback(async (trackId: string) => {
    if (!currentProject) return
    if (!confirm(`确定要删除轨道 "${trackId}" 吗？`)) return
    try {
      await deleteTrack(currentProject, trackId)
      toast.success(`已删除轨道: ${trackId}`)
    } catch (e: any) {
      toast.error(`删除失败：${e?.message || e}`)
    }
  }, [currentProject, toast])

  const handleReorderTrack = useCallback(
    async (direction: 'up' | 'down') => {
      if (!currentProject || !selectedTrackId) {
        toast.info('请先选中要排序的轨道')
        return
      }
      const idx = trackOrder.indexOf(selectedTrackId)
      if (direction === 'up' && idx <= 0) {
        toast.info('已在最顶部，无法上移')
        return
      }
      if (direction === 'down' && idx >= trackOrder.length - 1) {
        toast.info('已在最底部，无法下移')
        return
      }
      const newOrder = [...trackOrder]
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      // 交换位置
      ;[newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]]
      try {
        // 尝试调用后端API，后端未实现时前端本地处理
        await reorderTrack(currentProject, selectedTrackId, direction, trackOrder)
      } catch {
        // 后端未实现，前端本地处理（静默忽略错误）
      }
      setTrackOrder(newOrder)
      toast.success(`${direction === 'up' ? '上移' : '下移'}轨道: ${selectedTrackId}`)
    },
    [currentProject, selectedTrackId, trackOrder, toast],
  )

  // 数据提取
  const sections: Section[] = projectData?.sections || []
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
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* 工程选择栏（常驻） */}
      <div className="flex items-center gap-2 p-3 border-b bg-gray-50 dark:bg-gray-800 dark:border-gray-700 shrink-0">
        <select
          value={currentProject || ''}
          onChange={(e) => e.target.value && handleSelectProject(e.target.value)}
          className="flex-1 border rounded-md px-3 py-1.5 text-sm bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">-- 选择工程 --</option>
          {projects.map((p: any) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
        {currentProject && (
          <>
            <button
              onClick={() => handleRenameProject(currentProject)}
              className="px-2 py-1.5 bg-blue-500 text-white rounded-md text-xs hover:bg-blue-600 transition shrink-0"
              title="重命名工程"
            >
              ✏️ 重命名
            </button>
            <button
              onClick={() => handleCopyProject(currentProject)}
              className="px-2 py-1.5 bg-purple-500 text-white rounded-md text-xs hover:bg-purple-600 transition shrink-0"
              title="复制工程"
            >
              📋 复制
            </button>
            <button
              onClick={() => handleDeleteProject(currentProject)}
              className="px-2 py-1.5 bg-red-500 text-white rounded-md text-xs hover:bg-red-600 transition shrink-0"
              title="删除工程"
            >
              🗑️ 删除
            </button>
          </>
        )}
        <button
          onClick={handleNewProject}
          className="px-3 py-1.5 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 transition shrink-0"
        >
          + 新建
        </button>
      </div>

      {/* Tab 栏 */}
      <div className="flex border-b shrink-0 bg-white dark:bg-gray-800 dark:border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'px-4 py-2 text-sm border-b-2 transition',
              activeTab === tab
                ? 'border-blue-500 text-blue-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {!currentProject && (
          <div className="h-full flex items-center justify-center text-center text-gray-400">
            <div>
              <p className="text-lg">请先选择工程</p>
              <p className="text-sm mt-2">使用左侧对话或上方下拉框</p>
            </div>
          </div>
        )}

        {currentProject && activeTab === '工程' && (
          <div className="h-full overflow-y-auto p-4 space-y-4">
            {loading && <div className="text-center text-gray-400 mt-10">加载中...</div>}
            {error && <div className="text-center text-red-400 mt-10">{error}</div>}
            {!loading && projectData && (
              <>
                <BasicInfo
                  bpm={bpm}
                  key={key}
                  style={style}
                  mood={mood}
                  time_signature={timeSig}
                  language={lang}
                />
                <SectionTable sections={sections} />
                {chordRaw && <ChordViz chordName={chordRaw} notes={chordNotes} />}
                <ExportPanel />
              </>
            )}
          </div>
        )}

        {currentProject && activeTab === '分轨' && (
          <div className="h-full flex flex-col min-h-0">
            {/* 轨道管理工具栏 */}
            <div className="flex items-center gap-2 px-3 py-2 border-b bg-gray-50 dark:bg-gray-800 dark:border-gray-700 shrink-0">
              <button
                onClick={handleAddTrack}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-xs hover:bg-blue-600 transition"
              >
                + 添加轨道
              </button>
              {selectedTrackId && (
                <>
                  <button
                    onClick={() => handleReorderTrack('up')}
                    className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-xs hover:bg-blue-600 transition"
                    title="上移轨道"
                  >
                    上移
                  </button>
                  <button
                    onClick={() => handleReorderTrack('down')}
                    className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-xs hover:bg-blue-600 transition"
                    title="下移轨道"
                  >
                    下移
                  </button>
                  <button
                    onClick={() => handleDeleteTrack(selectedTrackId)}
                    className="px-3 py-1.5 bg-red-500 text-white rounded-md text-xs hover:bg-red-600 transition"
                  >
                    删除选中轨道
                  </button>
                </>
              )}
              <span className="text-xs text-gray-400 ml-auto">
                {selectedTrackId ? `选中: ${selectedTrackId}` : '点击轨道选中'}
              </span>
            </div>
            {/* 左：分轨混音 / 总览 切换 */}
            <div className="flex-1 flex min-h-0">
              {/* 视图切换 */}
              <div className="flex flex-col">
                <div className="flex flex-col gap-1 p-2 border-r bg-gray-50 dark:bg-gray-800 dark:border-gray-700 shrink-0">
                  <button
                    onClick={() => setMixView('mix')}
                    className={[
                      'px-3 py-2 rounded text-xs font-medium transition',
                      mixView === 'mix' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 border hover:bg-gray-100',
                    ].join(' ')}
                  >
                    🎚 混音台
                  </button>
                  <button
                    onClick={() => setMixView('arrange')}
                    className={[
                      'px-3 py-2 rounded text-xs font-medium transition',
                      mixView === 'arrange' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 border hover:bg-gray-100',
                    ].join(' ')}
                  >
                    🗂 总览
                  </button>
                </div>
              </div>
              <div className="flex-1 border-r min-h-0">
                {mixView === 'mix' ? (
                  <MixView selectedId={selectedTrackId} onSelect={handleSelectMixTrack} />
                ) : (
                  <ArrangeView selectedId={selectedTrackId} onSelect={handleSelectMixTrack} />
                )}
              </div>
              {/* 右：轨道编辑（主从） */}
              <div className="flex-1 min-h-0 flex flex-col">
                {selectedTrackId ? (
                  <TrackSubView
                    trackId={selectedTrackId}
                    trackMd={trackMd}
                    saveState={saveState}
                    onSave={handleSave}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center text-gray-400">
                    <div>
                      <p>点击左侧任意轨道</p>
                      <p className="text-sm mt-1">查看混音状态并编辑其音符 / MD</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {currentProject && activeTab === '文件' && (
          <FileBrowser project={currentProject} />
        )}

        {currentProject && activeTab === '技能' && <SkillPanel />}
      </div>
    </div>
  )
}

/** 分轨右侧：音符卷帘 / MD 编辑器 子切换 */
function TrackSubView({
  trackId,
  trackMd,
  saveState,
  onSave,
}: {
  trackId: string
  trackMd: string
  saveState: 'idle' | 'saving' | 'saved' | 'error'
  onSave: (md: string) => void
}) {
  const [sub, setSub] = useState<'notes' | 'md'>('notes')
  const track = MIX_TRACKS.find((t) => t.id === trackId) || null

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex gap-2 p-2 border-b bg-gray-50 dark:bg-gray-800 dark:border-gray-700 shrink-0">
        <SubTab active={sub === 'notes'} onClick={() => setSub('notes')}>
          音符卷帘
        </SubTab>
        <SubTab active={sub === 'md'} onClick={() => setSub('md')}>
          MD 编辑器
        </SubTab>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden p-3">
        {sub === 'notes' ? (
          track ? (
            <NoteEditor track={track} />
          ) : (
            <div className="text-gray-400 text-sm">无混音元数据，使用 MD 编辑器。</div>
          )
        ) : (
          <TrackEditor trackId={trackId} initialMd={trackMd} onSave={onSave} saveState={saveState} />
        )}
      </div>
    </div>
  )
}

function SubTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3 py-1 rounded text-sm transition',
        active ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 border hover:bg-gray-100',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
