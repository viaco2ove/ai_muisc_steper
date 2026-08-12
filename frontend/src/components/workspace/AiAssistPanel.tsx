// D 层（LLM 协助）UI 面板：整轨指令 / 插入乐段 / 选中音符调整。
// P4-1: AI 调整改走 WS 对话链路（受限 ReAct + 多步自纠错），不再直调 HTTP。
import { useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { wsClient } from '../../services/wsClient'

interface Props {
  project: string
  trackId: string
  notes: Note[]
  selectedIds: string[]
  vocal?: boolean
  onToast: (msg: string, kind?: 'info' | 'success' | 'error') => void
}

// 局部引入 Note 类型仅为 props 标注
import type { Note } from '../../utils/noteModel'

const PRESET_NOTE = ['移调 +12（升八度）', '移调 -12（降八度）', '力度 +15', '力度 -15', '时值拉长 1.5x', '时值缩短 0.66x']
const TONE_PRESET = ['气声多一点', '更紧张', '放松', '换成女声', '换成男声', '力度加强', '力度轻一点']

export default function AiAssistPanel({ project, trackId, notes, selectedIds, vocal, onToast }: Props) {
  const [open, setOpen] = useState(false)
  const [instr, setInstr] = useState('')
  const [afterBar, setAfterBar] = useState(20)
  const [bars, setBars] = useState(4)
  const [noteInstr, setNoteInstr] = useState('')
  const aiBusy = useProjectStore((s) => s.aiBusy)
  const setAiBusy = useProjectStore((s) => s.setAiBusy)
  // 选中音符的下标（后端 ai_* 技能按索引选取）
  const selIdx = selectedIds
    .map((id) => notes.findIndex((n) => n.id === id))
    .filter((i) => i >= 0)

  function send(opts: { mode: 'track' | 'insert' | 'note'; instruction?: string; indices?: number[]; after_bar?: number; bars?: number }) {
    if (!project || !trackId) {
      onToast('请先选择工程与轨道', 'error')
      return
    }
    const ok = wsClient.sendAiAdjust({
      project,
      track: trackId,
      instruction: opts.instruction || '',
      mode: opts.mode,
      indices: opts.indices,
      vocal,
      after_bar: opts.after_bar,
      bars: opts.bars,
    })
    if (!ok) {
      onToast('WS 未连接，无法发送 AI 调整', 'error')
      return
    }
    setAiBusy(true)
    onToast('已提交 AI 调整（WS ReAct 进行中…）', 'info')
  }

  return (
    <div className="border rounded bg-indigo-50/70 dark:bg-gray-800 dark:border-gray-700">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-indigo-700"
        onClick={() => setOpen((v) => !v)}
      >
        <span>🤖 AI 助手（整轨 / 乐段 / 选中音符）</span>
        <span className="text-xs text-gray-400">{open ? '收起' : '展开'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-3 text-xs">
          <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            AI 调整走 WS 对话链路（受限 ReAct + 多步自纠错）。调整结果会在对话区生成可回滚预览卡片，确认后写盘。
            {aiBusy && <span className="ml-1 text-indigo-600">⏳ 调整中…</span>}
          </p>

          {/* 整轨指令 */}
          <div className="space-y-1">
            <div className="font-medium text-gray-600">① 整轨自然语言指令</div>
            <div className="flex gap-1">
              <input
                value={instr}
                onChange={(e) => setInstr(e.target.value)}
                placeholder="如：升一个八度 / 整体力度加强 / 时值缩短"
                className="border rounded px-2 py-1 flex-1 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              />
              <button
                disabled={aiBusy}
                onClick={() => send({ mode: 'track', instruction: instr })}
                className="px-3 rounded bg-indigo-600 text-white disabled:opacity-40"
              >
                应用
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {PRESET_NOTE.map((p) => (
                <button
                  key={p}
                  disabled={aiBusy}
                  onClick={() => send({ mode: 'track', instruction: p })}
                  className="px-2 py-1 rounded border border-indigo-200 bg-white text-indigo-700 dark:bg-gray-700 dark:text-indigo-300 dark:border-indigo-700 disabled:opacity-40 hover:bg-indigo-50 dark:hover:bg-gray-600"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* 插入乐段 */}
          <div className="space-y-1">
            <div className="font-medium text-gray-600">② 在第 N 小节后插入 X 小节乐段</div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1">
                第
                <input
                  type="number" min={1} value={afterBar}
                  onChange={(e) => setAfterBar(Number(e.target.value))}
                  className="border rounded px-1 py-1 w-14 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                />
                小节后
              </label>
              <label className="flex items-center gap-1">
                插入
                <input
                  type="number" min={1} max={16} value={bars}
                  onChange={(e) => setBars(Number(e.target.value))}
                  className="border rounded px-1 py-1 w-14 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                />
                小节
              </label>
              <button
                disabled={aiBusy}
                onClick={() => send({ mode: 'insert', after_bar: afterBar, bars })}
                className="px-3 rounded bg-indigo-600 text-white disabled:opacity-40"
              >
                生成
              </button>
            </div>
          </div>

          {/* 选中音符调整 */}
          <div className="space-y-1">
            <div className="font-medium text-gray-600">
              ③ 选中音符 AI 调整
              <span className="ml-1 text-gray-400">（已选 {selectedIds.length} 个）</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {(vocal ? TONE_PRESET : PRESET_NOTE).map((p) => (
                <button
                  key={p}
                  disabled={aiBusy || !selIdx.length}
                  onClick={() => send({ mode: 'note', instruction: p, indices: selIdx })}
                  className="px-2 py-1 rounded border border-indigo-200 bg-white text-indigo-700 dark:bg-gray-700 dark:text-indigo-300 dark:border-indigo-700 disabled:opacity-40 hover:bg-indigo-50 dark:hover:bg-gray-600"
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                value={noteInstr}
                onChange={(e) => setNoteInstr(e.target.value)}
                placeholder="或输入自由指令，如：降低八度并加重"
                className="border rounded px-2 py-1 flex-1 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              />
              <button
                disabled={aiBusy || !selIdx.length}
                onClick={() => send({ mode: 'note', instruction: noteInstr, indices: selIdx })}
                className="px-3 rounded bg-indigo-600 text-white disabled:opacity-40"
              >
                应用
              </button>
            </div>
            {!selectedIds.length && (
              <p className="text-[11px] text-gray-400">提示：先在卷帘里点选音符（可配合 Shift 多选预留）。</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
