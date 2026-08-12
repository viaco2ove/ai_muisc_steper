import { useEffect, useRef, useCallback } from 'react'
import { useProjectStore } from '../store/projectStore'
import { useTrackStore } from '../store/trackStore'
import { getProject } from '../services/api'
import { wsClient } from '../services/wsClient'

// 经当前页面 host 的 /ws 路径，由 vite 代理转发到后端(8000)。
// 连接与收发由 wsClient 单例管理，本 hook 只负责把消息路由到 store，并提供 sendChat。
export function useWebSocket() {
  const storeRef = useRef(useProjectStore.getState())

  // 保持 store 引用最新（不放进 connect 依赖，避免重连）
  useEffect(() => {
    const unsub = useProjectStore.subscribe((s) => {
      storeRef.current = s
    })
    return unsub
  }, [])

  const handleMessage = useCallback((data: any) => {
    const s = storeRef.current
    const type = data.type
    // 后端字段: log/skill_done 用 msg, text 用 msg, project_updated 用 project(工程名)
    switch (type) {
      case 'pong':
        break
      case 'reasoning':
        // 流式思考过程: 后端发 {msg:text, done:bool}
        s.streamReasoning(data.msg || '', !!data.done)
        break
      case 'log':
        s.addChat({ role: 'log', msg: (data.tool ? `[${data.tool}] ` : '') + (data.msg || '') })
        break
      case 'text':
        s.addChat({ role: 'assistant', msg: data.msg || '' })
        break
      case 'llm_raw':
        s.addChat({ role: 'log', msg: '[LLM] ' + (data.msg || '').slice(0, 200) })
        break
      case 'action':
        // 工具执行中/完成: action 表示开始, skill_done 表示结束
        if (data.status === 'ok') {
          s.addChat({ role: 'skill_done', msg: `✅ ${data.tool || '技能'} 执行成功`, files: data.files })
        } else if (data.status === 'error') {
          s.addChat({ role: 'log', msg: `❌ ${data.tool || '技能'} 执行失败: ${data.error || ''}` })
        } else {
          // running 状态不显示
        }
        break
      case 'skill_done':
        s.addChat({ role: 'skill_done', msg: `${data.tool || ''} ${data.status === 'ok' ? '✓' : '✗'}`, files: data.files })
        break
      case 'observation':
        // 技能输出结果
        const output = data.output || data.content || ''
        if (output) {
          // 尝试解析 JSON 结果
          try {
            const json = JSON.parse(output)
            if (json.status === 'ok') {
              const summary = json.diagnosis
                ? `诊断完成: 完整性 ${json.diagnosis.completeness}%`
                : json.suggestion
                ? json.suggestion
                : `执行成功`
              s.addChat({ role: 'skill_done', msg: summary, files: data.files })
            } else {
              s.addChat({ role: 'observation', msg: output.slice(0, 500) })
            }
          } catch {
            // 非 JSON
            s.addChat({ role: 'observation', msg: output.slice(0, 500) })
          }
        }
        break
      case 'artifact':
        // 生成的文件列表
        if (data.files && data.files.length > 0) {
          s.addChat({ role: 'artifact', msg: `生成文件: ${data.files.map((f: string) => f.split(/[/\\]/).pop()).join(', ')}`, files: data.files })
        }
        break
      case 'chain_start':
        s.addChat({ role: 'log', msg: `▶ 任务链: ${(data.tools || []).join(' → ')}` })
        s.setWsStatus('running')
        s.setAiBusy(true)
        break
      case 'chain_done':
        s.addChat({ role: 'log', msg: `■ 完成: ok=${data.ok} fail=${data.fail}` })
        s.setWsStatus('connected')
        s.setAiBusy(false)
        break
      // P4-1: AI 调整完成，触发可回滚预览卡片
      case 'ai_adjust_result': {
        const { project, track, isVocal, backupId, before, after, message } = data
        const id = `pending_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        useTrackStore.getState().stagePending({
          id,
          project: project || '',
          trackId: track,
          isVocal: !!isVocal,
          before: before || [],
          after: after || [],
          message: message || 'AI 调整完成',
          applied: false,
          source: 'backend',
          wsOrigin: true,
          backupId,
        })
        s.addChat({ role: 'tool_call', msg: message || 'AI 调整完成', files: [id] })
        s.setAiBusy(false)
        break
      }
      case 'ai_adjust_undone':
        s.addChat({ role: 'log', msg: `↩️ 已撤销 AI 调整（${data.track || ''}）` })
        break
      case 'ai_adjust_applied':
        s.addChat({ role: 'log', msg: `✅ 已确认应用 AI 调整` })
        break
      case 'project_updated':
        // 后端发工程名, 重新拉取工程数据
        if (data.project) {
          getProject(data.project)
            .then((d) => s.loadProjectData(d))
            .catch(() => {})
        }
        break
      case 'error':
        s.addChat({ role: 'log', msg: '❌ ' + (data.msg || '') })
        s.setAiBusy(false)
        break
      default:
        console.log('[WS] Unknown msg:', type, data)
    }
  }, [])

  useEffect(() => {
    wsClient.connect()
    const off = wsClient.onMessage(handleMessage)
    return () => {
      off()
    }
  }, [handleMessage])

  const sendChat = useCallback((msg: string, audioPath?: string, project?: string) => {
    const ok = wsClient.sendChat(msg, audioPath, project)
    if (!ok) console.warn('[WS] Not connected, cannot send')
    return ok
  }, [])

  return { sendChat }
}
