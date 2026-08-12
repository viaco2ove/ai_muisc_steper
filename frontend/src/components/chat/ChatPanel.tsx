import React, { useState, useRef, useEffect } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import { uploadAudio } from '../../services/api'
import ToolCallCard from './ToolCallCard'
import MarkdownView from '../common/MarkdownView'

export default function ChatPanel() {
  const { chat, audioPath, setAudioPath, currentProject, addChat, aiBusy, wsStatus } = useProjectStore()
  const { sendChat } = useWebSocket()
  const { recording, audioBlob, start, stop, reset } = useAudioRecorder()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat])

  // 录音结束后自动上传
  useEffect(() => {
    if (audioBlob) {
      const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' })
      uploadAudio(file)
        .then((r) => {
          setAudioPath(r.audio_path)
          setInput((p) => p + ' [已录音上传]')
        })
        .catch(console.error)
      reset()
    }
  }, [audioBlob])

  const handleSend = () => {
    if (!input.trim()) return
    // P0-2: 乐观插入用户消息，立即进列表（hook 的 sendChat 只负责传输）
    addChat({ role: 'user', msg: input, files: audioPath ? [audioPath] : undefined })
    sendChat(input, audioPath || undefined, currentProject || undefined)
    setInput('')
    setAudioPath(null)
  }


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const result = await uploadAudio(file)
      setAudioPath(result.audio_path)
      setInput((prev) => prev + ` [已上传音频: ${file.name}]`)
    } catch (err) {
      console.error('Upload failed:', err)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRecord = () => {
    if (recording) {
      stop()
    } else {
      reset()
      start()
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Top toolbar */}
      <div className="flex gap-2 p-3 border-b bg-white dark:bg-gray-800 dark:border-gray-700">
        <button
          onClick={handleRecord}
          className={`px-3 py-1.5 rounded-md text-sm transition ${
            recording
              ? 'bg-red-600 text-white animate-pulse'
              : 'bg-red-500 text-white hover:bg-red-600'
          }`}
        >
          {recording ? '● 停止' : '录音'}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition"
        >
          上传音频
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        {audioPath && (
          <span className="text-xs text-gray-500 self-center ml-2 truncate max-w-[150px]">
            已选: {audioPath.split(/[/\\]/).pop()}
          </span>
        )}
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chat.length === 0 && !aiBusy && (
          <div className="text-center text-gray-400 mt-10">
            <p>开始对话吧！</p>
            <p className="text-sm mt-1">AI会帮你完成音乐工程</p>
          </div>
        )}
        {chat.map((item) => (
          <MessageBubble key={item.id} message={item} />
        ))}
        {/* AI 进度指示器 */}
        {aiBusy && (
          <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg animate-pulse">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
            </div>
            <span className="text-sm text-blue-600">
              {wsStatus === 'running' ? 'AI 思考中...' : 'AI 处理中...'}
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter发送)"
            className="flex-1 resize-none border rounded-md px-3 py-2 text-sm bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: { id: string; role: string; msg: string; files?: string[] } }) {
  const { role, msg, files } = message

  if (role === 'reasoning') {
    // 思考过程: 折叠的灰色框, 与正文分开
    if (!msg) return null
    return (
      <details className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2" open>
        <summary className="text-xs text-amber-700 cursor-pointer select-none flex items-center gap-1">
          <span>💭</span><span>AI思考过程</span>
        </summary>
        <p className="text-xs text-amber-800 whitespace-pre-wrap mt-1 max-h-60 overflow-y-auto">{msg}</p>
      </details>
    )
  }

  if (role === 'log') {
    return (
      <div className="flex items-start gap-2">
        <span className="text-xs text-gray-400 mt-1 shrink-0">[LOG]</span>
        <p className="text-xs text-gray-400 whitespace-pre-wrap">{msg}</p>
      </div>
    )
  }

  if (role === 'observation') {
    // 技能执行观察结果
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2 text-blue-600 text-xs">
          <span>📋</span>
          <span className="font-medium">执行结果</span>
        </div>
        <p className="text-xs text-blue-700 whitespace-pre-wrap mt-1 max-h-40 overflow-y-auto">{msg}</p>
      </div>
    )
  }

  if (role === 'artifact') {
    // 生成的文件
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2 text-purple-600 text-xs">
          <span>📁</span>
          <span className="font-medium">生成文件</span>
        </div>
        {msg && <p className="text-xs text-purple-700 mt-1">{msg}</p>}
        {files && files.length > 0 && (
          <div className="mt-2 space-y-1">
            {files.map((f, i) => (
              <div key={i} className="text-xs text-purple-600 bg-purple-100 rounded px-2 py-1 truncate">
                {f.split(/[/\\]/).pop()}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (role === 'skill_done') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-center gap-2 text-green-700">
          <span className="text-lg">&#10003;</span>
          <span className="font-medium">技能执行完成</span>
        </div>
        {msg && <p className="text-sm text-green-600 mt-1">{msg}</p>}
        {files && files.length > 0 && (
          <div className="mt-2 text-xs text-green-600">
            产物: {files.map((f) => f.split(/[/\\]/).pop()).join(', ')}
          </div>
        )}
      </div>
    )
  }

  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-blue-500 text-white rounded-lg px-4 py-2 max-w-[80%]">
          <p className="text-sm whitespace-pre-wrap">{msg}</p>
        </div>
      </div>
    )
  }

  if (role === 'tool_call') {
    // D3/D4/D6：AI 调整的回滚 preview 卡片
    return (
      <div className="flex justify-start">
        <div className="max-w-[88%]">
          <ToolCallCard message={message} />
        </div>
      </div>
    )
  }

  // assistant
  return (
    <div className="flex justify-start">
      <div className="bg-white border rounded-lg px-4 py-2 max-w-[80%] shadow-sm text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
        <MarkdownView content={msg} />
      </div>
    </div>
  )
}