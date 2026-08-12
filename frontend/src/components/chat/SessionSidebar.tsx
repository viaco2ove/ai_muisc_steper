import { useEffect, useState } from 'react'
import {
  listSessions,
  createSession,
  deleteSession,
  renameSession,
  getSessionMessages,
  saveSessionMessages,
  type SessionInfo,
} from '../../services/sessions'

interface SessionSidebarProps {
  currentSessionId: string | null
  onSelectSession: (sessionId: string | null, messages: any[]) => void
  onClose: () => void
  messages: any[] // 当前消息用于保存到 session
}

export default function SessionSidebar({
  currentSessionId,
  onSelectSession,
  onClose,
  messages,
}: SessionSidebarProps) {
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const loadSessions = async () => {
    setLoading(true)
    try {
      const list = await listSessions()
      setSessions(list)
    } catch (e) {
      console.error('Failed to load sessions:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])

  const handleNew = async () => {
    const title = prompt('对话标题:', '新对话')
    if (!title) return
    try {
      const session = await createSession(title)
      // 保存当前消息到当前会话
      if (currentSessionId && messages.length > 0) {
        await saveSessionMessages(currentSessionId, messages as any)
      }
      setSessions([session, ...sessions])
      onSelectSession(session.id, [])
    } catch (e) {
      console.error('Failed to create session:', e)
    }
  }

  const handleSelect = async (sid: string) => {
    try {
      // 保存当前会话的消息
      if (currentSessionId && currentSessionId !== sid && messages.length > 0) {
        await saveSessionMessages(currentSessionId, messages as any)
      }
      // 加载选中会话的消息
      const msgs = await getSessionMessages(sid)
      onSelectSession(sid, msgs)
    } catch (e) {
      console.error('Failed to select session:', e)
    }
  }

  const handleDelete = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('确定要删除这个对话吗？')) return
    try {
      await deleteSession(sid)
      setSessions(sessions.filter((s) => s.id !== sid))
      if (currentSessionId === sid) {
        onSelectSession(null, [])
      }
    } catch (e) {
      console.error('Failed to delete session:', e)
    }
  }

  const handleStartRename = (session: SessionInfo, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(session.id)
    setEditTitle(session.title)
  }

  const handleSaveRename = async (sid: string) => {
    if (!editTitle.trim()) {
      setEditingId(null)
      return
    }
    try {
      const updated = await renameSession(sid, editTitle.trim())
      setSessions(sessions.map((s) => (s.id === sid ? updated : s)))
      setEditingId(null)
    } catch (e) {
      console.error('Failed to rename:', e)
    }
  }

  const fmtTime = (ts: number) => {
    if (!ts) return ''
    const d = new Date(ts)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="fixed inset-y-0 left-0 w-80 bg-white dark:bg-gray-900 border-r shadow-lg z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">对话历史</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
        >
          ×
        </button>
      </div>

      <div className="p-3 border-b dark:border-gray-700">
        <button
          onClick={handleNew}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition"
        >
          ＋ 新建对话
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading && <div className="text-center text-gray-400 py-4">加载中...</div>}
        {!loading && sessions.length === 0 && (
          <div className="text-center text-gray-400 py-4 text-sm">暂无对话</div>
        )}
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => handleSelect(session.id)}
            className={`group p-3 rounded-md mb-1 cursor-pointer transition ${
              currentSessionId === session.id
                ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              {editingId === session.id ? (
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => handleSaveRename(session.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename(session.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="flex-1 px-1 py-0.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                />
              ) : (
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                    {session.title}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {session.message_count || 0} 条消息 · {fmtTime(session.updated)}
                  </div>
                </div>
              )}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={(e) => handleStartRename(session, e)}
                  className="text-gray-400 hover:text-blue-500 text-xs"
                  title="重命名"
                >
                  ✏️
                </button>
                <button
                  onClick={(e) => handleDelete(session.id, e)}
                  className="text-gray-400 hover:text-red-500 text-xs"
                  title="删除"
                >
                  🗑
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}