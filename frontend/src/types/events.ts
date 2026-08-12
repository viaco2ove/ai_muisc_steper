// P2-1: WebSocket 事件类型定义
// 统一管理所有 WS 消息类型，便于类型检查和重构

export type WsEventType =
  | 'chat'           // 用户发送聊天消息
  | 'reasoning'      // AI 思考过程（流式）
  | 'tool_call'      // AI 调用工具（开始）
  | 'action'         // 工具执行状态（running/ok/error）
  | 'observation'    // 技能执行观察结果
  | 'skill_done'     // 技能执行完成
  | 'done'           // 整体任务完成
  | 'text'           // AI 文本回复（流式）
  | 'log'            // 日志消息
  | 'llm_raw'        // LLM 原始输出
  | 'artifact'       // 生成的文件列表
  | 'chain_start'    // 任务链开始
  | 'chain_done'     // 任务链完成
  | 'ai_adjust_result' // AI 调整结果预览
  | 'ai_adjust_undo'   // AI 调整撤销
  | 'ai_adjust_applied' // AI 调整已应用
  | 'project_updated'   // 工程已更新
  | 'pong'           // 心跳响应
  | 'error'          // 错误消息

// 基础事件接口
export interface BaseEvent {
  type: WsEventType
}

// 思考过程事件
export interface ReasoningEvent extends BaseEvent {
  type: 'reasoning'
  msg: string
  done: boolean
}

// 工具调用事件
export interface ToolCallEvent extends BaseEvent {
  type: 'tool_call'
  tool: string
  args?: Record<string, unknown>
  status?: 'running' | 'ok' | 'error'
}

// 工具执行动作事件
export interface ActionEvent extends BaseEvent {
  type: 'action'
  tool: string
  status: 'running' | 'ok' | 'error'
  files?: string[]
  error?: string
}

// 技能执行完成事件
export interface SkillDoneEvent extends BaseEvent {
  type: 'skill_done'
  tool: string
  status: 'ok' | 'error'
  files?: string[]
  error?: string
}

// 观察结果事件
export interface ObservationEvent extends BaseEvent {
  type: 'observation'
  output?: string
  content?: string
  files?: string[]
}

// 文本回复事件（流式）
export interface TextEvent extends BaseEvent {
  type: 'text'
  msg: string
}

// 日志事件
export interface LogEvent extends BaseEvent {
  type: 'log'
  msg: string
  tool?: string
}

// LLM 原始输出事件
export interface LlmRawEvent extends BaseEvent {
  type: 'llm_raw'
  msg: string
}

// 产物/文件事件
export interface ArtifactEvent extends BaseEvent {
  type: 'artifact'
  files: string[]
}

// 任务链开始
export interface ChainStartEvent extends BaseEvent {
  type: 'chain_start'
  tools: string[]
}

// 任务链完成
export interface ChainDoneEvent extends BaseEvent {
  type: 'chain_done'
  ok: number
  fail: number
}

// AI 调整结果
export interface AiAdjustResultEvent extends BaseEvent {
  type: 'ai_adjust_result'
  project: string
  track: string
  isVocal?: boolean
  backupId: string
  before: unknown[]
  after: unknown[]
  message: string
}

// AI 调整撤销
export interface AiAdjustUndoEvent extends BaseEvent {
  type: 'ai_adjust_undo'
  track: string
}

// AI 调整已应用
export interface AiAdjustAppliedEvent extends BaseEvent {
  type: 'ai_adjust_applied'
}

// 工程更新事件
export interface ProjectUpdatedEvent extends BaseEvent {
  type: 'project_updated'
  project: string
}

// 错误事件
export interface ErrorEvent extends BaseEvent {
  type: 'error'
  msg: string
}

// 联合类型
export type WsEvent =
  | ReasoningEvent
  | ToolCallEvent
  | ActionEvent
  | SkillDoneEvent
  | ObservationEvent
  | TextEvent
  | LogEvent
  | LlmRawEvent
  | ArtifactEvent
  | ChainStartEvent
  | ChainDoneEvent
  | AiAdjustResultEvent
  | AiAdjustUndoEvent
  | AiAdjustAppliedEvent
  | ProjectUpdatedEvent
  | ErrorEvent
  | { type: 'chat'; msg: string; audio_path?: string; project?: string }
  | { type: 'pong' }

// 工具调用卡片显示的数据结构（用于 ToolCallCard 组件）
export interface ToolCallDisplay {
  id: string
  tool: string
  args?: Record<string, unknown>
  logs: string[]
  artifacts: string[]
  duration?: number
  status: 'running' | 'ok' | 'error'
  error?: string
  retryCount?: number
}
