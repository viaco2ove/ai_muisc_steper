// P4-5: ReAct 步骤时间线组件 - 显示 AI 思考过程中的 tool_call/observation 步骤及耗时
import { useState } from 'react'
import { useProjectStore } from '../../store/projectStore'

export interface StepRecord {
  id: string
  type: 'tool_call' | 'observation' | 'reasoning'
  name?: string  // 工具名（如 edit_notes, list_tracks）
  summary: string  // 简短描述
  duration?: number  // 耗时（毫秒）
  timestamp: number
  details?: string  // 详细信息
}

interface StepTimelineProps {
  className?: string
  maxSteps?: number  // 最多显示步数，默认 20
}

// 从 chat 历史中提取步骤记录
function extractSteps(chat: { id: string; role: string; msg: string; files?: string[] }[]): StepRecord[] {
  const steps: StepRecord[] = []
  let currentReasoning = ''
  let reasoningStart = 0
  let lastTimestamp = Date.now()

  for (const msg of chat) {
    const timestamp = parseInt(msg.id.split('_')[0]) || lastTimestamp

    if (msg.role === 'reasoning') {
      // 开始或继续 reasoning
      if (!reasoningStart) reasoningStart = timestamp
      currentReasoning += msg.msg
    } else if (msg.role === 'reasoning_done') {
      // reasoning 完成，记录一个 reasoning 步骤
      if (currentReasoning) {
        steps.push({
          id: `reasoning_${timestamp}`,
          type: 'reasoning',
          summary: currentReasoning.slice(0, 100) + (currentReasoning.length > 100 ? '...' : ''),
          duration: timestamp - reasoningStart,
          timestamp: reasoningStart,
          details: currentReasoning,
        })
        currentReasoning = ''
        reasoningStart = 0
      }
    } else if (msg.role === 'tool_call') {
      // 提取工具调用信息
      let toolName = 'unknown'
      let summary = msg.msg
      // 尝试从消息中提取工具名
      const toolMatch = msg.msg.match(/调用工具[:\s]*(.+?)(?:\n|$)/i)
      if (toolMatch) toolName = toolMatch[1].trim()
      const summaryMatch = msg.msg.match(/工具描述[:\s]*(.+?)(?:\n|$)/i)
      if (summaryMatch) summary = summaryMatch[1].trim()

      steps.push({
        id: msg.id,
        type: 'tool_call',
        name: toolName,
        summary: summary,
        timestamp,
        details: msg.msg,
      })
    } else if (msg.role === 'observation') {
      // 观察结果，记录耗时（从上一步 tool_call 到现在的时长）
      const lastStep = steps[steps.length - 1]
      const duration = lastStep?.type === 'tool_call' ? timestamp - lastStep.timestamp : undefined

      steps.push({
        id: msg.id,
        type: 'observation',
        summary: msg.msg.slice(0, 80) + (msg.msg.length > 80 ? '...' : ''),
        duration,
        timestamp,
        details: msg.msg,
      })
    }

    lastTimestamp = timestamp
  }

  return steps
}

// 格式化时长
function formatDuration(ms?: number): string {
  if (!ms) return ''
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}m ${s}s`
}

// 步骤图标
function StepIcon({ type }: { type: StepRecord['type'] }) {
  switch (type) {
    case 'tool_call':
      return <span className="text-purple-500" title="工具调用">⚙️</span>
    case 'observation':
      return <span className="text-blue-500" title="执行结果">📋</span>
    case 'reasoning':
      return <span className="text-amber-500" title="AI思考">💭</span>
  }
}

// 单个步骤项
function StepItem({ step, expanded }: { step: StepRecord; expanded: boolean }) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div
      className={`flex items-start gap-2 py-2 px-2 rounded transition-colors ${
        expanded ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      {/* 时间线连接线 */}
      <div className="flex flex-col items-center">
        <StepIcon type={step.type} />
        <div className="w-px h-full min-h-[24px] bg-gray-200 dark:bg-gray-700 mt-1" />
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {step.type === 'tool_call' && step.name && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200 font-mono">
              {step.name}
            </span>
          )}
          <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1">
            {step.summary}
          </span>
          {step.duration !== undefined && (
            <span className="text-[10px] text-gray-400 tabular-nums shrink-0">
              {formatDuration(step.duration)}
            </span>
          )}
        </div>

        {/* 详情折叠 */}
        {step.details && (
          <div className="mt-1">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showDetails ? '▲ 收起' : '▼ 详情'}
            </button>
            {showDetails && (
              <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-[10px] text-gray-600 dark:text-gray-400 whitespace-pre-wrap max-h-32 overflow-auto">
                {step.details}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function StepTimeline({ className = '', maxSteps = 20 }: StepTimelineProps) {
  const { chat } = useProjectStore()
  const [expanded, setExpanded] = useState(false)
  const steps = extractSteps(chat).slice(-maxSteps)

  // 计算总耗时
  const totalDuration = steps.reduce((sum, s) => sum + (s.duration || 0), 0)

  // 统计
  const toolCallCount = steps.filter((s) => s.type === 'tool_call').length
  const observationCount = steps.filter((s) => s.type === 'observation').length

  if (steps.length === 0) {
    return (
      <div className={`border rounded-lg p-4 text-center text-gray-400 text-sm ${className}`}>
        暂无步骤记录
      </div>
    )
  }

  return (
    <div className={`border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* 头部 */}
      <div
        className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">ReAct 步骤</span>
        <span className="text-xs text-gray-400">
          {steps.length} 步 · {toolCallCount} 调用 · {observationCount} 结果
        </span>
        {totalDuration > 0 && (
          <span className="text-xs text-gray-400 tabular-nums ml-auto">
            总耗时: {formatDuration(totalDuration)}
          </span>
        )}
        <span className="text-gray-400 text-xs">
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* 步骤列表 */}
      {expanded && (
        <div className="max-h-80 overflow-y-auto">
          {steps.map((step) => (
            <StepItem
              key={step.id}
              step={step}
              expanded={expanded}
            />
          ))}
        </div>
      )}
    </div>
  )
}
