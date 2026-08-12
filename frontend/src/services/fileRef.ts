/**
 * 文件引用解析服务
 * 支持 @ 语法引用工程内的文件，并解析为可访问的 URL
 * 语法: @filename 或 @folder/filename
 */

/**
 * 解析 @ 文件引用
 * @param ref 文件引用字符串，如 "@intro.mp3" 或 "@audio/verse.wav"
 * @param projectName 当前工程名称
 * @returns 解析后的文件 URL 或 null（无效引用）
 */
export function resolveFileRef(ref: string, projectName: string): string | null {
  if (!ref || !ref.startsWith('@')) {
    return null
  }

  const path = ref.slice(1).trim()
  if (!path) {
    return null
  }

  // 构建文件访问 URL
  // 通过 API 端点访问工程内文件
  const encodedPath = encodeURIComponent(path)
  const encodedProject = encodeURIComponent(projectName)
  return `/api/project/${encodedProject}/file?path=${encodedPath}`
}

/**
 * 检查字符串是否包含 @ 文件引用
 * @param text 待检查的文本
 * @returns 是否包含文件引用
 */
export function hasFileRef(text: string): boolean {
  return /@[\w\-\.\/]+/.test(text)
}

/**
 * 从文本中提取所有 @ 文件引用
 * @param text 待提取的文本
 * @returns 文件引用数组
 */
export function extractFileRefs(text: string): string[] {
  const matches = text.match(/@[\w\-\.\/]+/g)
  return matches ? [...new Set(matches)] : []
}

/**
 * 将文本中的 @ 文件引用转换为可点击的链接
 * @param text 原始文本
 * @param projectName 当前工程名称
 * @param _onClick 点击回调（可选，已废弃）
 * @returns React 元素数组
 */
export function parseTextWithFileRefs(
  text: string,
  projectName: string,
  _onClick?: (ref: string, url: string) => void
): Array<{ type: 'text' | 'ref'; content: string; url?: string }> {
  const parts: Array<{ type: 'text' | 'ref'; content: string; url?: string }> = []
  const regex = /@[\w\-\.\/]+/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    // 添加匹配前的文本
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }

    // 添加文件引用
    const ref = match[0]
    const url = resolveFileRef(ref, projectName)
    if (url) {
      parts.push({ type: 'ref', content: ref, url })
    } else {
      parts.push({ type: 'text', content: ref })
    }

    lastIndex = match.index + ref.length
  }

  // 添加剩余文本
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) })
  }

  return parts
}

/**
 * 验证文件引用是否指向有效的文件类型
 * @param ref 文件引用
 * @param allowedExtensions 允许的文件扩展名数组
 * @returns 是否有效
 */
export function validateFileRef(ref: string, allowedExtensions?: string[]): boolean {
  if (!ref.startsWith('@')) {
    return false
  }

  const path = ref.slice(1).trim()
  if (!path) {
    return false
  }

  // 检查是否有扩展名
  const lastDot = path.lastIndexOf('.')
  if (lastDot === -1 || lastDot === path.length - 1) {
    return false
  }

  const ext = path.slice(lastDot).toLowerCase()

  if (allowedExtensions) {
    return allowedExtensions.includes(ext)
  }

  // 默认允许的常见文件类型
  const defaultAllowed = [
    '.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a',  // 音频
    '.mid', '.midi', '.json', '.yaml', '.yml',          // 音乐数据
    '.txt', '.md', '.lyrics',                          // 文本
    '.pdf', '.doc', '.docx',                           // 文档
    '.png', '.jpg', '.jpeg', '.gif', '.svg',           // 图片
  ]

  return defaultAllowed.includes(ext)
}

/**
 * 文件引用组件的 Props
 */
export interface FileRefSpanProps {
  ref: string
  projectName: string
  className?: string
  onClick?: (ref: string, url: string) => void
  children?: React.ReactNode
}

/**
 * 获取文件引用的元信息（扩展名、文件名等）
 */
export function getFileRefMeta(ref: string): { filename: string; extension: string; folder: string | null } {
  const path = ref.startsWith('@') ? ref.slice(1).trim() : ref
  const lastSlash = path.lastIndexOf('/')
  const filename = lastSlash === -1 ? path : path.slice(lastSlash + 1)
  const folder = lastSlash === -1 ? null : path.slice(0, lastSlash)
  const lastDot = filename.lastIndexOf('.')
  const extension = lastDot === -1 ? '' : filename.slice(lastDot)

  return { filename, extension, folder }
}
