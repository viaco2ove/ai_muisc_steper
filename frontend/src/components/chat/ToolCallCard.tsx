// D3/D4/D6：对话区渲染 AI 调整的「工具调用」卡片。
// 展示 before/after 的 diff + 校验警告，并提供 应用 / 撤销 / 丢弃（可回滚）。
import { useTrackStore } from '../../store/trackStore'
import { diffNotes, validateNotes, midiToName } from '../../utils/noteModel'
import { useToast } from '../common/Toast'
import { saveTrackNotes } from '../../services/api'
import { wsClient } from '../../services/wsClient'

interface Props {
  message: { id: string; msg: string; files?: string[] }
}

export default function ToolCallCard({ message }: Props) {
  const toast = useToast()
  const pendingId = message.files?.[0]
  const pending = useTrackStore((s) => (pendingId ? s.pending[pendingId] : undefined))

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
    }
    const undoWs = () => {
      wsClient.sendAiAdjustUndo(backupId) // 服务端恢复备份
      useTrackStore.getState().undoPending(pending.id) // 内存回到 before
      toast.info('已撤销 AI 调整')
    }
    const discardWs = () => {
      wsClient.sendAiAdjustUndo(backupId) // 服务端恢复备份
      useTrackStore.getState().discardPending(pending.id)
      toast.info('已丢弃 AI 调整')
    }
    return (
      <div className="border rounded-lg px-3 py-2 bg-indigo-50 border-indigo-200">
        <div className="flex items-center gap-2 text-indigo-700 text-xs mb-1">
          <span>🤖</span>
          <span className="font-medium">AI 调整预览（WS ReAct）</span>
          <span className="text-indigo-400">· {pending.applied ? '已应用' : '待应用'}</span>
        </div>
        <p className="text-xs text-indigo-800 mb-2">{message.msg}</p>
        <div className="text-[11px] text-gray-600 mb-2 flex gap-3 flex-wrap">
          <span className="text-amber-600">改 {changed}</span>
          <span className="text-green-600">增 {added}</span>
          <span className="text-red-500">删 {removed}</span>
        </div>
        <div className="space-y-1 max-h-40 overflow-y-auto mb-2">
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
        <div className="flex gap-2">
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
        </div>
      </div>
    )
  }

  const apply = () => {
    useTrackStore.getState().applyPending(pending.id)
    if (pending.project) {
      saveTrackNotes(pending.project, pending.trackId, pending.after)
        .then(() => toast.success('已应用并落盘到工程'))
        .catch((e: any) => toast.error(`落盘失败：${e?.message || e}`))
    } else {
      toast.success('已应用（本地演示）')
    }
  }
  const undo = () => {
    useTrackStore.getState().undoPending(pending.id)
    if (pending.project) {
      saveTrackNotes(pending.project, pending.trackId, pending.before).catch(() => {})
    }
    toast.info('已撤销')
  }
  const discard = () => {
    useTrackStore.getState().discardPending(pending.id)
  }

  return (
    <div className="border rounded-lg px-3 py-2 bg-indigo-50 border-indigo-200">
      <div className="flex items-center gap-2 text-indigo-700 text-xs mb-1">
        <span>🤖</span>
        <span className="font-medium">AI 调整预览</span>
        <span className="text-indigo-400">· {pending.applied ? '已应用' : '待应用'}</span>
      </div>
      <p className="text-xs text-indigo-800 mb-2">{message.msg}</p>

      <div className="text-[11px] text-gray-600 mb-2 flex gap-3 flex-wrap">
        <span className="text-amber-600">改 {changed}</span>
        <span className="text-green-600">增 {added}</span>
        <span className="text-red-500">删 {removed}</span>
      </div>

      {/* diff 明细（最多 8 条，折叠其余） */}
      <div className="space-y-1 max-h-40 overflow-y-auto mb-2">
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

      <div className="flex gap-2">
        {pending.applied ? (
          <button
            onClick={undo}
            className="px-3 py-1 rounded bg-amber-500 text-white text-xs hover:bg-amber-600"
          >
            撤销
          </button>
        ) : (
          <button
            onClick={apply}
            className="px-3 py-1 rounded bg-indigo-600 text-white text-xs hover:bg-indigo-700"
          >
            应用
          </button>
        )}
        <button
          onClick={discard}
          className="px-3 py-1 rounded bg-gray-200 text-gray-600 text-xs hover:bg-gray-300"
        >
          丢弃
        </button>
      </div>
    </div>
  )
}
