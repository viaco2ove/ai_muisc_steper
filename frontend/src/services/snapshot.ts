// P4-7: 工程版本快照服务 - 保存工程到 localStorage，支持 diff 对比
import { getProject } from './api'

export interface SnapshotMeta {
  id: string
  projectName: string
  timestamp: number
  label?: string  // 用户自定义标签
  trackCount: number
  size: number  // 预估大小（字节）
}

export interface SnapshotData {
  meta: SnapshotMeta
  project: any  // 原始工程数据
  tracks: any[]  // 各轨道音符数据
}

const STORAGE_KEY = 'ai-music-snapshots'
const MAX_SNAPSHOTS = 20  // 最多保留快照数

// 获取所有快照
export function getSnapshots(): SnapshotMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

// 获取单个快照详情
export function getSnapshot(id: string): SnapshotData | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${id}`)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// 保存快照
export async function saveSnapshot(projectName: string, label?: string): Promise<SnapshotMeta> {
  // 获取工程数据
  const projectData = await getProject(projectName)

  // 获取各轨道音符（简化版，只记录轨道列表）
  const tracks = projectData?.tracks || []

  const snapshot: SnapshotData = {
    meta: {
      id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      projectName,
      timestamp: Date.now(),
      label,
      trackCount: tracks.length,
      size: JSON.stringify(projectData).length,
    },
    project: projectData,
    tracks,
  }

  // 保存详情
  localStorage.setItem(`${STORAGE_KEY}_${snapshot.meta.id}`, JSON.stringify(snapshot))

  // 更新索引
  const snapshots = getSnapshots()
  snapshots.unshift(snapshot.meta)

  // 限制数量
  while (snapshots.length > MAX_SNAPSHOTS) {
    const removed = snapshots.pop()
    if (removed) {
      localStorage.removeItem(`${STORAGE_KEY}_${removed.id}`)
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots))

  return snapshot.meta
}

// 删除快照
export function deleteSnapshot(id: string): void {
  localStorage.removeItem(`${STORAGE_KEY}_${id}`)
  const snapshots = getSnapshots().filter((s) => s.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots))
}

// 清空所有快照
export function clearSnapshots(): void {
  const snapshots = getSnapshots()
  for (const s of snapshots) {
    localStorage.removeItem(`${STORAGE_KEY}_${s.id}`)
  }
  localStorage.removeItem(STORAGE_KEY)
}

// 对比两个快照的差异
export interface DiffResult {
  added: string[]  // 新增的键
  removed: string[]  // 删除的键
  changed: { key: string; old: any; new: any }[]  // 修改的键
}

export function diffSnapshots(snapA: SnapshotData, snapB: SnapshotData): DiffResult {
  const result: DiffResult = { added: [], removed: [], changed: [] }

  const keysA = new Set(Object.keys(snapA.project || {}))
  const keysB = new Set(Object.keys(snapB.project || {}))

  // 找出新增的键
  for (const key of keysB) {
    if (!keysA.has(key)) {
      result.added.push(key)
    }
  }

  // 找出删除的键
  for (const key of keysA) {
    if (!keysB.has(key)) {
      result.removed.push(key)
    }
  }

  // 找出修改的键
  for (const key of keysA) {
    if (keysB.has(key)) {
      const valA = JSON.stringify(snapA.project[key])
      const valB = JSON.stringify(snapB.project[key])
      if (valA !== valB) {
        result.changed.push({
          key,
          old: snapA.project[key],
          new: snapB.project[key],
        })
      }
    }
  }

  return result
}

// 格式化 diff 结果为可读文本
export function formatDiff(diff: DiffResult): string {
  const lines: string[] = []

  if (diff.added.length > 0) {
    lines.push(`新增 (${diff.added.length}):`)
    for (const key of diff.added) {
      lines.push(`  + ${key}`)
    }
  }

  if (diff.removed.length > 0) {
    lines.push(`删除 (${diff.removed.length}):`)
    for (const key of diff.removed) {
      lines.push(`  - ${key}`)
    }
  }

  if (diff.changed.length > 0) {
    lines.push(`修改 (${diff.changed.length}):`)
    for (const { key, old: _old, new: _new } of diff.changed) {
      lines.push(`  ~ ${key}`)
    }
  }

  if (lines.length === 0) {
    return '无变化'
  }

  return lines.join('\n')
}

// 格式化时间戳
export function formatTimestamp(ts: number): string {
  const date = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - ts

  // 1 分钟内
  if (diff < 60000) {
    return '刚刚'
  }
  // 1 小时内
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)} 分钟前`
  }
  // 24 小时内
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)} 小时前`
  }

  // 同一年显示月日
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
}

// 格式化文件大小
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
