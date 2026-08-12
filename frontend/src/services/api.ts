import type { ProjectListItem } from '../store/projectStore'

// 相对路径：开发时经 vite 代理转发到后端(8000)，生产/Electron 同源部署同样可用。
// 如需覆盖，设 VITE_API_BASE（如 http://other-host:8000，结尾不带 /）。
const BASE_URL: string = (import.meta.env.VITE_API_BASE as string | undefined) || ''

function encodeName(name: string): string {
  return encodeURIComponent(name)
}

export async function listProjects(): Promise<ProjectListItem[]> {
  const res = await fetch(`${BASE_URL}/api/projects`)
  if (!res.ok) throw new Error(`listProjects failed: ${res.status}`)
  return res.json()
}

export async function createProject(name: string, style?: string, bpm?: number, key?: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/project/new`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, style, bpm, key }),
  })
  if (!res.ok) throw new Error(`createProject failed: ${res.status}`)
  return res.json()
}

export async function getProject(name: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/project/${encodeName(name)}`)
  if (!res.ok) throw new Error(`getProject failed: ${res.status}`)
  return res.json()
}

export async function getTrack(name: string, tid: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/project/${encodeName(name)}/track/${encodeName(tid)}`)
  if (!res.ok) throw new Error(`getTrack failed: ${res.status}`)
  return res.json()
}

// 轨道音符（A1 trackLoader）。后端未实现时由前端回退 genDemoNotes。
export async function getTrackNotes(name: string, tid: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/project/${encodeName(name)}/track/${encodeName(tid)}/notes`)
  if (!res.ok) throw new Error(`getTrackNotes failed: ${res.status}`)
  return res.json()
}

export async function saveTrack(name: string, tid: string, md: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/project/${encodeName(name)}/track/${encodeName(tid)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ md }),
  })
  if (!res.ok) throw new Error(`saveTrack failed: ${res.status}`)
}

// 轨道音符落盘（A1/D4）：前端 Notes 直接 PUT，后端转规范 JSON 写回。
export async function saveTrackNotes(name: string, tid: string, notes: any[]): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/project/${encodeName(name)}/track/${encodeName(tid)}/notes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  })
  if (!res.ok) throw new Error(`saveTrackNotes failed: ${res.status}`)
}

export async function deleteProject(name: string): Promise<{ status: string; deleted: string }> {
  const res = await fetch(`${BASE_URL}/api/project/${encodeName(name)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`deleteProject failed: ${res.status}`)
  return res.json()
}

export async function renameProject(name: string, newName: string): Promise<{ status: string; old: string; new: string }> {
  const res = await fetch(`${BASE_URL}/api/project/${encodeName(name)}/rename?new_name=${encodeURIComponent(newName)}`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error(`renameProject failed: ${res.status}`)
  return res.json()
}

// Track APIs
export interface TrackInfo {
  id: string
  name: string
  role: string
  status: string
  type: string
  instrument: string
  volume: number
  muted?: boolean
}

export async function listTracks(projectName: string): Promise<TrackInfo[]> {
  const res = await fetch(`${BASE_URL}/api/project/${encodeName(projectName)}/tracks`)
  if (!res.ok) throw new Error(`listTracks failed: ${res.status}`)
  return res.json()
}

export async function createTrack(projectName: string, track: { id: string; name: string; type?: string; role?: string; instrument?: string }): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/project/${encodeName(projectName)}/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(track),
  })
  if (!res.ok) throw new Error(`createTrack failed: ${res.status}`)
  return res.json()
}

export async function deleteTrack(projectName: string, trackId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/project/${encodeName(projectName)}/track/${encodeName(trackId)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`deleteTrack failed: ${res.status}`)
  return res.json()
}

export async function updateTrack(projectName: string, trackId: string, updates: Partial<TrackInfo>): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/project/${encodeName(projectName)}/track/${encodeName(trackId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error(`updateTrack failed: ${res.status}`)
  return res.json()
}

export async function uploadAudio(file: File, project?: string): Promise<{ audio_path: string; filename: string }> {
  const formData = new FormData()
  formData.append('file', file)
  if (project) formData.append('project', project)
  const res = await fetch(`${BASE_URL}/api/audio/upload`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error(`uploadAudio failed: ${res.status}`)
  return res.json()
}

export interface ProjectFile {
  path: string
  type: string
  size: number
  time: number
}

export async function listFiles(projectName: string): Promise<ProjectFile[]> {
  const res = await fetch(`${BASE_URL}/api/project/${encodeName(projectName)}/files`)
  if (!res.ok) throw new Error(`listFiles failed: ${res.status}`)
  return res.json()
}

/** 工程内文件预览/下载 URL（后端 /api/project/{name}/file?path=...） */
export function fileUrl(projectName: string, path: string): string {
  return `${BASE_URL}/api/project/${encodeName(projectName)}/file?path=${encodeURIComponent(path)}`
}

export interface SkillInfo {
  name: string
  description?: string
  executable?: boolean
  entry_script?: string
  params?: Record<string, string>
}

export async function listSkills(): Promise<SkillInfo[]> {
  const res = await fetch(`${BASE_URL}/api/skills`)
  if (!res.ok) throw new Error(`listSkills failed: ${res.status}`)
  return res.json()
}

export async function runSkill(tool: string, args: Record<string, any>): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/skill/${encodeName(tool)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ args }),
  })
  if (!res.ok) throw new Error(`runSkill failed: ${res.status}`)
  return res.json()
}