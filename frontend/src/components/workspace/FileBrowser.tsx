import { useEffect, useMemo, useRef, useState } from 'react'
import { listFiles, fileUrl, type ProjectFile } from '../../services/api'

interface TreeNode {
  name: string
  path: string
  isDir: boolean
  children: Record<string, TreeNode>
  file?: ProjectFile
}

const TEXT_TYPES = new Set(['md', 'json', 'txt', 'csv', 'mscx', 'xml', 'ustx'])
const IMG_TYPES = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'])
const AUDIO_TYPES = new Set(['wav', 'mp3', 'ogg', 'm4a'])

const ICON_BY_TYPE: Record<string, string> = {
  wav: '🎵',
  mp3: '🎵',
  mid: '🎼',
  json: '🔧',
  md: '📝',
}

function buildTree(files: ProjectFile[]): TreeNode {
  const root: TreeNode = { name: '', path: '', isDir: true, children: {} }
  for (const f of files) {
    const parts = f.path.split('/')
    let cur = root
    let acc = ''
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      acc = acc ? `${acc}/${part}` : part
      const isLast = i === parts.length - 1
      if (isLast) {
        cur.children[part] = { name: part, path: acc, isDir: false, children: {}, file: f }
      } else {
        const existing = cur.children[part]
        // 同名冲突升级：若更深路径需要它作为目录，把已存在的文件节点升级为目录
        if (!existing || !existing.isDir) {
          cur.children[part] = {
            name: part,
            path: acc,
            isDir: true,
            children: existing?.children || {},
          }
        }
        cur = cur.children[part]
      }
    }
  }
  return root
}

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

type Preview =
  | { kind: 'none' }
  | { kind: 'text'; text: string }
  | { kind: 'image'; url: string }
  | { kind: 'audio'; url: string }
  | { kind: 'other'; url: string }
  | { kind: 'error'; msg: string }

function FileTreeNode({
  node,
  depth,
  project,
  selectedPath,
  onSelect,
}: {
  node: TreeNode
  depth: number
  project: string
  selectedPath: string | null
  onSelect: (n: TreeNode) => void
}) {
  const [open, setOpen] = useState(true)
  const pad = { paddingLeft: `${depth * 12 + 8}px` }

  if (node.isDir) {
    const keys = Object.keys(node.children).sort((a, b) => {
      const ca = node.children[a]
      const cb = node.children[b]
      if (ca.isDir !== cb.isDir) return ca.isDir ? -1 : 1
      return a.localeCompare(b)
    })
    return (
      <div>
        <div
          className="flex items-center gap-1 py-1 text-sm text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
          style={pad}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="text-gray-400 w-4">{open ? '▾' : '▸'}</span>
          <span className="font-medium">📁 {node.name}</span>
        </div>
        {open &&
          keys.map((k) => (
            <FileTreeNode
              key={k}
              node={node.children[k]}
              depth={depth + 1}
              project={project}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
      </div>
    )
  }

  const icon = ICON_BY_TYPE[node.file?.type || ''] || '📄'
  const active = node.path === selectedPath
  return (
    <div
      className={[
        'flex items-center gap-1 py-1 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700',
        active ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300',
      ].join(' ')}
      style={pad}
      onClick={() => onSelect(node)}
    >
      <span className="w-4" />
      <span>{icon}</span>
      <span className="truncate flex-1">{node.name}</span>
      {node.file && <span className="text-[10px] text-gray-400 tabular-nums">{fmtSize(node.file.size)}</span>}
    </div>
  )
}

export default function FileBrowser({ project }: { project: string }) {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<TreeNode | null>(null)
  const [preview, setPreview] = useState<Preview>({ kind: 'none' })
  const abortRef = useRef<AbortController | null>(null)

  const tree = useMemo(() => buildTree(files), [files])

  useEffect(() => {
    setLoading(true)
    setError(null)
    setSelected(null)
    setPreview({ kind: 'none' })
    listFiles(project)
      .then(setFiles)
      .catch((e) => setError(String(e?.message || e)))
      .finally(() => setLoading(false))
  }, [project])

  useEffect(() => {
    if (!selected?.file) {
      setPreview({ kind: 'none' })
      return
    }
    const f = selected.file
    const url = fileUrl(project, f.path)
    if (TEXT_TYPES.has(f.type)) {
      // 异步保护：切换文件时取消上一个未完成的请求，避免慢响应覆盖当前预览；
      // 同时检查 r.ok，错误响应体不当作文件内容渲染。
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setPreview({ kind: 'none' })
      fetch(url, { signal: ctrl.signal })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.text()
        })
        .then((t) => setPreview({ kind: 'text', text: t }))
        .catch((e) => {
          if (ctrl.signal.aborted) return
          setPreview({ kind: 'error', msg: String(e?.message || e) })
        })
    } else if (IMG_TYPES.has(f.type)) {
      setPreview({ kind: 'image', url })
    } else if (AUDIO_TYPES.has(f.type)) {
      setPreview({ kind: 'audio', url })
    } else {
      setPreview({ kind: 'other', url })
    }
  }, [selected, project])

  return (
    <div className="flex h-full min-h-0">
      {/* 左：文件树 */}
      <div className="w-64 shrink-0 border-r overflow-auto bg-gray-50 dark:bg-gray-800 dark:border-gray-700 p-1">
        {loading && <div className="text-sm text-gray-400 p-3">加载中…</div>}
        {error && <div className="text-sm text-red-400 p-3">{error}</div>}
        {!loading && !error && files.length === 0 && (
          <div className="text-sm text-gray-400 p-3">暂无文件</div>
        )}
        {!loading &&
          !error &&
          Object.keys(tree.children)
            .sort((a, b) => {
              const ca = tree.children[a]
              const cb = tree.children[b]
              if (ca.isDir !== cb.isDir) return ca.isDir ? -1 : 1
              return a.localeCompare(b)
            })
            .map((k) => (
              <FileTreeNode
                key={k}
                node={tree.children[k]}
                depth={0}
                project={project}
                selectedPath={selected?.path || null}
                onSelect={setSelected}
              />
            ))}
      </div>

      {/* 右：预览 */}
      <div className="flex-1 min-h-0 flex flex-col">
        {!selected && (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            点击左侧文件预览
          </div>
        )}
        {selected && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center gap-2 px-3 py-2 border-b bg-white dark:bg-gray-800 dark:border-gray-700 shrink-0">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{selected.path}</span>
              <a
                href={fileUrl(project, selected.path)}
                download
                className="ml-auto text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300"
                target="_blank"
                rel="noreferrer"
              >
                下载
              </a>
            </div>
            <div className="flex-1 min-h-0 overflow-auto p-3">
              {preview.kind === 'text' && (
                <pre className="text-xs leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words font-mono">
                  {preview.text.length > 100000
                    ? preview.text.slice(0, 100000) + '\n…(已截断，完整内容请下载)'
                    : preview.text}
                </pre>
              )}
              {preview.kind === 'image' && (
                <img src={preview.url} alt={selected.name} className="max-w-full max-h-full object-contain" />
              )}
              {preview.kind === 'audio' && <audio src={preview.url} controls className="w-full" />}
              {preview.kind === 'other' && (
                <div className="text-sm text-gray-500">
                  该类型（{selected.file?.type}）不支持内联预览，请
                  <a href={preview.url} download className="text-blue-500 underline">
                    下载
                  </a>
                  。
                </div>
              )}
              {preview.kind === 'error' && <div className="text-sm text-red-400">{preview.msg}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
