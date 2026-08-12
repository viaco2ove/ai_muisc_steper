// 单例 WebSocket 连接管理：对话区、AI 调整面板、可回滚预览卡片共用同一条连接。
// 覆盖：设 VITE_WS_URL（如 ws://other-host:8000/ws/chat）。
import { useProjectStore } from '../store/projectStore'

const WS_URL: string =
  (import.meta.env.VITE_WS_URL as string | undefined) ||
  `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/chat`

// 心跳/重连配置
const HEARTBEAT_INTERVAL = 30000       // 30秒心跳间隔
const HEARTBEAT_TIMEOUT = 5000         // 5秒心跳超时
const INITIAL_RECONNECT_DELAY = 1000    // 初始重连延迟 1秒
const MAX_RECONNECT_DELAY = 30000       // 最大重连延迟 30秒
const RECONNECT_MULTIPLIER = 1.5        // 退避系数

type MsgHandler = (data: any) => void
type StatusCb = (s: 'idle' | 'connected' | 'running') => void
type SendingCb = (s: boolean) => void

export interface AiAdjustPayload {
  project: string
  track: string
  instruction: string
  mode?: 'track' | 'insert' | 'note'
  indices?: number[]
  vocal?: boolean
  after_bar?: number
  bars?: number
}

export type WsConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

class WsClient {
  private ws: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  private manualClose = false
  private reconnectAttempt = 0
  private currentReconnectDelay = INITIAL_RECONNECT_DELAY
  private handlers = new Set<MsgHandler>()
  private statusCb: StatusCb | null = null
  private sendingCb: SendingCb | null = null
  private _sending = false
  private _connectionState: WsConnectionState = 'disconnected'
  private connectionStateListeners = new Set<(s: WsConnectionState) => void>()

  get connectionState(): WsConnectionState {
    return this._connectionState
  }

  private setConnectionState(state: WsConnectionState) {
    this._connectionState = state
    this.connectionStateListeners.forEach((cb) => cb(state))
  }

  onConnectionStateChange(cb: (s: WsConnectionState) => void): () => void {
    this.connectionStateListeners.add(cb)
    return () => this.connectionStateListeners.delete(cb)
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return
    this.manualClose = false
    this.setConnectionState('connecting')

    try {
      const ws = new WebSocket(WS_URL)
      ws.onopen = () => {
        this.reconnectAttempt = 0
        this.currentReconnectDelay = INITIAL_RECONNECT_DELAY
        useProjectStore.getState().setWsStatus('connected')
        this.statusCb?.('connected')
        this.setConnectionState('connected')
        this.startHeartbeat()
      }
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          // 收到任何消息都视为心跳响应
          if (data.type === 'pong' || data.type === 'heartbeat_ack') {
            this.clearHeartbeatTimeout()
            return
          }
          this.handlers.forEach((h) => h(data))
        } catch (e) {
          console.error('[WS] parse failed:', e)
        }
      }
      ws.onclose = () => {
        this.clearHeartbeat()
        useProjectStore.getState().setWsStatus('idle')
        this.ws = null
        if (!this.manualClose) {
          this.setConnectionState('reconnecting')
          this.scheduleReconnect()
        } else {
          this.setConnectionState('disconnected')
        }
      }
      ws.onerror = () => {
        // onclose 会紧跟触发，这里不额外处理避免重复
      }
      this.ws = ws
    } catch (e) {
      console.error('[WS] Connection failed:', e)
      this.setConnectionState('disconnected')
    }
  }

  private startHeartbeat() {
    this.clearHeartbeat()
    this.heartbeatTimer = setTimeout(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
        // 启动心跳超时计时器
        this.heartbeatTimeoutTimer = setTimeout(() => {
          console.warn('[WS] Heartbeat timeout, closing connection')
          this.ws?.close()
        }, HEARTBEAT_TIMEOUT)
      }
    }, HEARTBEAT_INTERVAL)
  }

  private clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    this.clearHeartbeatTimeout()
  }

  private clearHeartbeatTimeout() {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    const delay = this.currentReconnectDelay
    this.reconnectAttempt++
    // 指数退避
    this.currentReconnectDelay = Math.min(
      this.currentReconnectDelay * RECONNECT_MULTIPLIER,
      MAX_RECONNECT_DELAY
    )
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})`)
    this.reconnectTimer = setTimeout(() => this.connect(), delay)
  }

  send(obj: any): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj))
      return true
    }
    return false
  }

  sendChat(msg: string, audioPath?: string, project?: string): boolean {
    const p: any = { type: 'chat', msg }
    if (audioPath) p.audio_path = audioPath
    if (project) p.project = project
    this._sending = true
    this.sendingCb?.(true)
    const ok = this.send(p)
    // 发送后保持 sending 状态直到收到响应
    return ok
  }

  /** P4-1: AI 调整走 WS 对话链路（受限 ReAct + 多步自纠错） */
  sendAiAdjust(o: AiAdjustPayload): boolean {
    return this.send({ type: 'ai_adjust', ...o })
  }

  /** P4-1: 撤销 AI 调整（恢复备份） */
  sendAiAdjustUndo(backupId: string): boolean {
    return this.send({ type: 'ai_adjust_undo', backupId })
  }

  /** P4-1: 确认应用 AI 调整（清理备份） */
  sendAiAdjustApply(backupId: string): boolean {
    return this.send({ type: 'ai_adjust_apply', backupId })
  }

  onMessage(h: MsgHandler): () => void {
    this.handlers.add(h)
    return () => {
      this.handlers.delete(h)
    }
  }

  setStatusCb(cb: StatusCb) {
    this.statusCb = cb
  }

  setSendingCb(cb: SendingCb) {
    this.sendingCb = cb
  }

  get sending(): boolean {
    return this._sending
  }

  // P2-4: 重试工具调用
  retryToolCall(pendingId: string): boolean {
    this._sending = true
    this.sendingCb?.(true)
    const ok = this.send({ type: 'retry_tool_call', pendingId })
    setTimeout(() => {
      this._sending = false
      this.sendingCb?.(false)
    }, 500)
    return ok
  }

  close() {
    this.manualClose = true
    this.clearHeartbeat()
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.setConnectionState('disconnected')
  }
}

export const wsClient = new WsClient()
