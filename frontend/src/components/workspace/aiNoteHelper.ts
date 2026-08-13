// aiNoteHelper.ts - AI 音符修改助手
import { wsClient } from '../../services/wsClient'
import { useProjectStore } from '../../store/projectStore'

export interface AiNotePayload {
  trackId: string
  noteId: string
  note: any
  instruction: string
}

export async function aiModifyNote(payload: AiNotePayload) {
  const { currentProject, addChat } = useProjectStore.getState()

  // 在对话区发送 AI 修改指令
  const prompt = `AI 修改音符 [${payload.noteId}] (轨道 ${payload.trackId}, 音高 ${payload.note.midi}, 时值 ${payload.note.durBeats}, 力度 ${payload.note.velocity}): ${payload.instruction}`

  // 插入用户消息
  addChat({ role: 'user', msg: prompt })

  // 通过 WS 发送
  wsClient.sendChat(prompt, undefined, currentProject || undefined)
}