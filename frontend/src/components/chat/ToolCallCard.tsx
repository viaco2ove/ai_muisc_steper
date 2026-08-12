// P2-2: ToolCallCard 增强版 - 参数表单/日志终端/产物/耗时/重试
// D3/D4/D6：对话区渲染 AI 调整的「工具调用」卡片。
// 展示 before/after 的 diff + 校验警告，并提供 应用 / 撤销 / 丢弃（可回滚）。
import { useState, useEffect, useRef } from 'react'
import { useTrackStore } from '../../store/trackStore'
import { diffNotes, validateNotes, midiToName } from '../../utils/noteModel'
import { useToast } from '../common/Toast'
import { saveTrackNotes } from '../../services/api'
import { wsClient } from '../../services/wsClient'

interface Props {
  message: { id: string; msg: string; files?: string[] }
}

// 内部日志状态（用于日志终端）
interface LogEntry {
  id: string
  time: string
  level: 'info' | 'warn' | 'error' | 'success'
  text: string
}

export default function ToolCallCard({ message }: Props) {
  const toast = useToast()
  const pendingId = message.files?.[0]
  const pending = useTrackStore((s) => (pendingId ? s.pending[pendingId] : undefined))

  // P2-2: 增强状态
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [elapsed, setElapsed] = useState<number>(0)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [showLogTerminal, setShowLogTerminal] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const logEndRef = useRef<HTMLDivElement>(null)

  // 计时器
  useEffect(() => {
    if (!pending || pending.applied) return
    const start = Date.now()
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [pending?.applied])

  // 自动滚动日志
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // P2-2: 添加日志
  const addLog = (text: string, level: LogEntry['level'] = 'info') => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setLogs((prev) => [...prev, { id: `${Date.now()}_${Math.random()}`, time, level, text }])
  }

  // 模拟工具调用日志（实际由 WS 事件驱动）
  useEffect(() => {
    if (pending) {
      addLog(`初始化工具: ${pending.trackId || 'track'}`, 'info')
      addLog('读取当前音符数据...', 'info')
      addLog(`加载 ${pending.before?.length || 0} 个音符`, 'success')
    }
  }, [pending?.id])

  // P2-2: 重试功能
  const handleRetry = async () => {
    setIsRetrying(true)
    setRetryCount((c) => c + 1)
    addLog('重试中...', 'warn')
    try {
      // 通过 WS 重试
      const ok = wsClient.retryToolCall(pendingId || '')
      if (!ok) {
        addLog('重试请求发送失败', 'error')
      } else {
        addLog('重试请求已发送', 'success')
      }
    } catch (e) {
      addLog(`重试失败: ${e}`, 'error')
    } finally {
      setIsRetrying(false)
    }
  }

  // P2-2: 格式化耗时
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }

  if (!pending) {
    return (
      <div className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500">
        🤖 {message.msg}（预览已失效/已丢弃）
      </div>
    )
  }

  const diffs = diffNotes(pending.before, pending.after)
  const warns = validateNotes(pending.after, pending.isVocal)
  const changed = diffs.filter((d) => d.kind === 'changed').length
  const added = diffs.filter((d) => d.kind === 'added').length
  const removed = diffs.filter((d) => d.kind === 'removed').length

  // P4-1: 来自 WS ReAct 的 AI 调整——磁盘已写入 after，撤销=恢复备份，应用=确认
  if (pending.wsOrigin) {
    const backupId = pending.backupId || ''
    const applyWs = () => {
      useTrackStore.getState().applyPending(pending.id)
      wsClient.sendAiAdjustApply(backupId)
      toast.success('已应用 AI 调整')
      addLog('用户确认应用调整', 'success')
    }
    const undoWs = () => {
      wsClient.sendAiAdjustUndo(backupId)
      useTrackStore.getState().undoPending(pending.id)
      toast.info('已撤销 AI 调整')
      addLog('用户撤销调整，恢复备份', 'info')
    }
    const discardWs = () => {
      wsClient.sendAiAdjustUndo(backupId)
      useTrackStore.getState().discardPending(pending.id)
      toast.info('已丢弃 AI 调整')
      addLog('用户丢弃调整', 'warn')
    }
    return (
      <div className="border rounded-lg px-3 py-2 bg-indigo-50 border-indigo-200">
        {/* 头部信息 */}
        <div className="flex items-center gap-2 text-indigo-700 text-xs mb-1">
          <span>🤖</span>
          <span className="font-medium">AI 调整预览（WS ReAct）</span>
          <span className="text-indigo-400">· {pending.applied ? '已应用' : '待应用'}</span>
          {/* P2-2: 耗时显示 */}
          <span className="ml-auto text-gray-400">{formatDuration(elapsed)}</span>
        </div>
        <p className="text-xs text-indigo-800 mb-2">{message.msg}</p>

        {/* P2-2: 统计信息 + 重试计数 */}
        <div className="text-[11px] text-gray-600 mb-2 flex gap-3 flex-wrap">
          <span className="text-amber-600">改 {changed}</span>
          <span className="text-green-600">增 {added}</span>
          <span className="text-red-500">删 {removed}</span>
          {retryCount > 0 && <span className="text-purple-500">重试 {retryCount} 次</span>}
        </div>

        {/* P2-2: 可折叠的 diff 明细 */}
        <div className="mb-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mb-1"
          >
            <span>{expanded ? '▼' : '▶'}</span>
            <span>查看变更详情 ({diffs.length} 处)</span>
          </button>
          {expanded && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {diffs.slice(0, 8).map((d) => (
                <div key={d.id} className="text-[11px] bg-white/70 rounded px-2 py-1">
                  {d.kind === 'added' && <span className="text-green-600">＋ {midiToName(d.note!.midi)}（新增）</span>}
                  {d.kind === 'removed' && <span className="text-red-500">－ {midiToName(d.note!.midi)}（删除）</span>}
                  {d.kind === 'changed' && (
                    <span className="text-gray-700">
                      {midiToName(pending.after.find((n) => n.id === d.id)!.midi)}：
                      {d.changes!.map((c) => (
                        <span key={c.name} className="ml-1">
                          {c.name} {String(c.from)}→<b className="text-indigo-700">{String(c.to)}</b>
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              ))}
              {diffs.length > 8 && <div className="text-[11px] text-gray-400">…还有 {diffs.length - 8} 处</div>}
            </div>
          )}
        </div>

        {/* P2-2: 校验警告 */}
        {warns.length > 0 && (
          <div className="mb-2 space-y-0.5">
            {warns.slice(0, 4).map((w, i) => (
              <div
                key={i}
                className={`text-[11px] px-2 py-0.5 rounded ${
                  w.level === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {w.level === 'error' ? '⛔ ' : '⚠️ '}
                {w.text}
              </div>
            ))}
            {warns.length > 4 && <div className="text-[11px] text-gray-400">…还有 {warns.length - 4} 条</div>}
          </div>
        )}

        {/* P2-2: 日志终端 */}
        {showLogTerminal && (
          <div className="mb-2 bg-gray-900 rounded p-2 max-h-32 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="text-[11px] font-mono flex gap-2">
                <span className="text-gray-500">[{log.time}]</span>
                <span className={
                  log.level === 'error' ? 'text-red-400' :
                  log.level === 'warn' ? 'text-yellow-400' :
                  log.level === 'success' ? 'text-green-400' : 'text-gray-300'
                }>{log.text}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}

        {/* P2-2: 操作按钮区 */}
        <div className="flex gap-2 items-center">
          {pending.applied ? (
            <button onClick={undoWs} className="px-3 py-1 rounded bg-amber-500 text-white text-xs hover:bg-amber-600">
              撤销
            </button>
          ) : (
            <button onClick={applyWs} className="px-3 py-1 rounded bg-indigo-600 text-white text-xs hover:bg-indigo-700">
              应用
            </button>
          )}
          <button onClick={discardWs} className="px-3 py-1 rounded bg-gray-200 text-gray-600 text-xs hover:bg-gray-300">
            丢弃
          </button>
          {/* P2-2: 重试按钮 */}
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="px-3 py-1 rounded bg-purple-500 text-white text-xs hover:bg-purple-600 disabled:opacity-50"
          >
            {isRetrying ? '重试中...' : '重试'}
          </button>
          {/* P2-2: 日志终端开关 */}
          <button
            onClick={() => setShowLogTerminal(!showLogTerminal)}
            className="px-3 py-1 rounded bg-gray-700 text-white text-xs hover:bg-gray-600"
          >
            {showLogTerminal ? '隐藏日志' : '查看日志'}
          </button>
        </div>
      </div>
    )
  }

  // 非 WS Origin 的普通预览卡片
  const apply = () => {
    useTrackStore.getState().applyPending(pending.id)
    addLog('应用调整中...', 'info')
    if (pending.project) {
      saveTrackNotes(pending.project, pending.trackId, pending.after)
        .then(() => {
          toast.success('已应用并落盘到工程')
          addLog('落盘成功', 'success')
        })
        .catch((e: any) => {
          toast.error(`落盘失败：${e?.message || e}`)
          addLog(`落盘失败: ${e}`, 'error')
        })
    } else {
      toast.success('已应用（本地演示）')
      addLog('本地应用成功', 'success')
    }
  }
  const undo = () => {
    useTrackStore.getState().undoPending(pending.id)
    addLog('撤销调整', 'warn')
    if (pending.project) {
      saveTrackNotes(pending.project, pending.trackId, pending.before).catch(() => {})
    }
    toast.info('已撤销')
  }
  const discard = () => {
    useTrackStore.getState().discardPending(pending.id)
    addLog('丢弃调整', 'warn')
  }

  return (
    <div className="border rounded-lg px-3 py-2 bg-indigo-50 border-indigo-200">
      <div className="flex items-center gap-2 text-indigo-700 text-xs mb-1">
        <span>🤖</span>
        <span className="font-medium">AI 调整预览</span>
        <span className="text-indigo-400">· {pending.applied ? '已应用' : '待应用'}</span>
        <span className="ml-auto text-gray-400">{formatDuration(elapsed)}</span>
      </div>
      <p className="text-xs text-indigo-800 mb-2">{message.msg}</p>

      <div className="text-[11px] text-gray-600 mb-2 flex gap-3 flex-wrap">
        <span className="text-amber-600">改 {changed}</span>
        <span className="text-green-600">增 {added}</span>
        <span className="text-red-500">删 {removed}</span>
        {retryCount > 0 && <span className="text-purple-500">重试 {retryCount} 次</span>}
      </div>

      {/* diff 明细（可折叠） */}
      <div className="mb-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mb-1"
        >
          <span>{expanded ? '▼' : '▶'}</span>
          <span>查看变更详情 ({diffs.length} 处)</span>
        </button>
        {expanded && (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {diffs.slice(0, 8).map((d) => (
              <div key={d.id} className="text-[11px] bg-white/70 rounded px-2 py-1">
                {d.kind === 'added' && <span className="text-green-600">＋ {midiToName(d.note!.midi)}（新增）</span>}
                {d.kind === 'removed' && <span className="text-red-500">－ {midiToName(d.note!.midi)}（删除）</span>}
                {d.kind === 'changed' && (
                  <span className="text-gray-700">
                    {midiToName(pending.after.find((n) => n.id === d.id)!.midi)}：
                    {d.changes!.map((c) => (
                      <span key={c.name} className="ml-1">
                        {c.name} {String(c.from)}→<b className="text-indigo-700">{String(c.to)}</b>
                      </span>
                    ))}
                  </span>
                )}
              </div>
            ))}
            {diffs.length > 8 && <div className="text-[11px] text-gray-400">…还有 {diffs.length - 8} 处</div>}
          </div>
        )}
      </div>

      {/* D6：校验警告 */}
      {warns.length > 0 && (
        <div className="mb-2 space-y-0.5">
          {warns.slice(0, 4).map((w, i) => (
            <div
              key={i}
              className={`text-[11px] px-2 py-0.5 rounded ${
                w.level === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {w.level === 'error' ? '⛔ ' : '⚠️ '}
              {w.text}
            </div>
          ))}
          {warns.length > 4 && <div className="text-[11px] text-gray-400">…还有 {warns.length - 4} 条</div>}
        </div>
      )}

      {/* P2-2: 日志终端 */}
      {showLogTerminal && (
        <div className="mb-2 bg-gray-900 rounded p-2 max-h-32 overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="text-[11px] font-mono flex gap-2">
              <span className="text-gray-500">[{log.time}]</span>
              <span className={
                log.level === 'error' ? 'text-red-400' :
                log.level === 'warn' ? 'text-yellow-400' :
                log.level === 'success' ? 'text-green-400' : 'text-gray-300'
              }>{log.text}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}

      <div className="flex gap-2 items-center">
        {pending.applied ? (
          <button onClick={undo} className="px-3 py-1 rounded bg-amber-500 text-white text-xs hover:bg-amber-600">
            撤销
          </button>
        ) : (
          <button onClick={apply} className="px-3 py-1 rounded bg-indigo-600 text-white text-xs hover:bg-indigo-700">
            应用
          </button>
        )}
        <button onClick={discard} className="px-3 py-1 rounded bg-gray-200 text-gray-600 text-xs hover:bg-gray-300">
          丢弃
        </button>
        <button onClick={handleRetry} disabled={isRetrying} className="px-3 py-1 rounded bg-purple-500 text-white text-xs hover:bg-purple-600 disabled:opacity-50">
          {isRetrying ? '重试中...' : '重试'}
        </button>
        <button onClick={() => setShowLogTerminal(!showLogTerminal)} className="px-3 py-1 rounded bg-gray-700 text-white text-xs hover:bg-gray-600">
          {showLogTerminal ? '隐藏日志' : '查看日志'}
        </button>
      </div>
    </div>
  )
}
