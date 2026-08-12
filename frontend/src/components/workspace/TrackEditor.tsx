// P3-3: TrackEditor - CodeMirror + 左编右预览布局
import { useState, useEffect, useRef, useMemo } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { githubLight } from '@uiw/codemirror-theme-github'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import ReactMarkdown from 'react-markdown'

interface TrackEditorProps {
  trackId: string
  initialMd?: string
  onSave?: (md: string) => void | Promise<void>
  saveState?: 'idle' | 'saving' | 'saved' | 'error'
  readonly?: boolean
}

export default function TrackEditor({ trackId, initialMd = '', onSave, saveState = 'idle', readonly = false }: TrackEditorProps) {
  const [md, setMd] = useState(initialMd)
  const [saved, setSaved] = useState(true)
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState<'edit' | 'split' | 'preview'>('split')
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  useEffect(() => {
    setMd(initialMd)
    setSaved(true)
    setSaving(false)
  }, [trackId, initialMd])

  // P3-3: CodeMirror 初始化
  useEffect(() => {
    if (!editorRef.current || viewMode === 'preview') {
      // 清理已有的 EditorView
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
      }
      return
    }

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newValue = update.state.doc.toString()
        setMd(newValue)
        setSaved(false)
      }
    })

    const saveKeymap = keymap.of([{
      key: 'Mod-s',
      run: () => {
        handleSave()
        return true
      }
    }])

    const state = EditorState.create({
      doc: md,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        drawSelection(),
        history(),
        markdown(),
        githubLight,
        updateListener,
        saveKeymap,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.lineWrapping,
        EditorState.readOnly.of(readonly),
      ]
    })

    const view = new EditorView({
      state,
      parent: editorRef.current
    })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [viewMode, readonly])

  // 当 initialMd 变化时同步到 CodeMirror
  useEffect(() => {
    if (viewRef.current && initialMd !== md) {
      const currentDoc = viewRef.current.state.doc.toString()
      if (currentDoc !== initialMd) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: initialMd }
        })
      }
    }
  }, [initialMd])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave?.(md)
      setSaved(true)
    } catch {
      setSaved(false)
    } finally {
      setSaving(false)
    }
  }

  const badge =
    saveState === 'saving' || saving
      ? { text: '保存中…', cls: 'text-blue-500' }
      : saveState === 'error'
      ? { text: '保存失败', cls: 'text-red-500' }
      : saveState === 'saved'
      ? { text: '已保存', cls: 'text-green-500' }
      : !saved
      ? { text: '未保存', cls: 'text-yellow-500' }
      : { text: '已保存', cls: 'text-green-500' }

  // P3-3: 左右分栏预览内容
  const previewContent = useMemo(() => {
    return (
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown>{md}</ReactMarkdown>
      </div>
    )
  }, [md])

  return (
    <div className="border rounded-lg p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-700">MD编辑器 - {trackId}</h3>
        <div className="flex gap-2 items-center">
          {/* P3-3: 视图切换 */}
          <div className="flex gap-1 mr-2">
            <button
              onClick={() => setViewMode('edit')}
              className={`px-2 py-1 text-xs rounded ${viewMode === 'edit' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title="仅编辑"
            >
              编辑
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-2 py-1 text-xs rounded ${viewMode === 'split' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title="左右分栏"
            >
              分栏
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-2 py-1 text-xs rounded ${viewMode === 'preview' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title="仅预览"
            >
              预览
            </button>
          </div>
          <span className={`text-xs ${badge.cls}`}>{badge.text}</span>
          {!readonly && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '保存中…' : '保存'}
            </button>
          )}
        </div>
      </div>

      {/* P3-3: 编辑器区域 */}
      <div className="flex-1 flex gap-2 min-h-0 overflow-hidden">
        {/* 左侧编辑器 */}
        {viewMode !== 'preview' && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col border rounded overflow-hidden`}>
            <div className="bg-gray-50 px-2 py-1 text-xs text-gray-500 border-b">
              Markdown
            </div>
            <div
              ref={editorRef}
              className="flex-1 overflow-auto [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto"
            />
          </div>
        )}

        {/* 右侧预览 */}
        {viewMode !== 'edit' && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col border rounded overflow-hidden`}>
            <div className="bg-gray-50 px-2 py-1 text-xs text-gray-500 border-b">
              预览
            </div>
            <div className="flex-1 overflow-auto p-3 bg-white">
              {previewContent}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-2">Ctrl+S 保存 · 支持 Markdown 格式</p>
    </div>
  )
}
