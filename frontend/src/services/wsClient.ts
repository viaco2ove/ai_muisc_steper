// 单例 WebSocket 连接管理：对话区、AI 调整面板、可回滚预览卡片共用同一条连接。
// 覆盖：设 VITE_WS_URL（如 ws://other-host:8000/ws/chat）。
import { useProjectStore } from '../store/projectStore'

const WS_URL: string =
  (import.meta.env.VITE_WS_URL as string | undefined) ||
  `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/chat`

type MsgHandler = (data: any) => void
type StatusCb = (s: 'idle' | 'connected' | 'running') => void

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

class WsClient {
  private ws: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private manualClose = false
  private handlers = new Set<MsgHandler>()
  private statusCb: StatusCb | null = null

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return
    this.manualClose = false
    try {
      const ws = new WebSocket(WS_URL)
      ws.onopen = () => {
        useProjectStore.getState().setWsStatus('connected')
        this.statusCb?.('connected')
      }
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.handlers.forEach((h) => h(data))
        } catch (e) {
          console.error('[WS] parse failed:', e)
        }
      }
      ws.onclose = () => {
        useProjectStore.getState().setWsStatus('idle')
        this.ws = null
        if (!this.manualClose) {
          this.reconnectTimer = setTimeout(() => this.connect(), 2000)
        }
      }
      ws.onerror = () => {
        // onclose 会紧跟触发，这里不额外处理避免重复
      }
      this.ws = ws
    } catch (e) {
      console.error('[WS] Connection failed:', e)
    }
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
    return this.send(p)
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

  close() {
    this.manualClose = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
  }
}

export const wsClient = new WsClient()
