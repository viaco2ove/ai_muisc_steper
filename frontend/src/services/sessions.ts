// sessions API - 历史对话管理
function encodeName(name: string): string {
  return encodeURIComponent(name)
}

export interface SessionInfo {
  id: string
  title: string
  created: number
  updated: number
  message_count?: number
}

export interface SessionMessage {
  role: string
  content?: string
  msg?: string
  files?: string[]
}

const BASE = ''

export async function listSessions(): Promise<SessionInfo[]> {
  const res = await fetch(`${BASE}/api/sessions`)
  if (!res.ok) throw new Error(`listSessions failed: ${res.status}`)
  return res.json()
}

export async function createSession(title = '新对话'): Promise<SessionInfo> {
  const res = await fetch(`${BASE}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!res.ok) throw new Error(`createSession failed: ${res.status}`)
  return res.json()
}

export async function getSession(id: string): Promise<any> {
  const res = await fetch(`${BASE}/api/sessions/${encodeName(id)}`)
  if (!res.ok) throw new Error(`getSession failed: ${res.status}`)
  return res.json()
}

export async function deleteSession(id: string): Promise<void> {
  const res = await fetch(`${BASE}/api/sessions/${encodeName(id)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`deleteSession failed: ${res.status}`)
}

export async function renameSession(id: string, title: string): Promise<SessionInfo> {
  const res = await fetch(`${BASE}/api/sessions/${encodeName(id)}/title`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!res.ok) throw new Error(`renameSession failed: ${res.status}`)
  return res.json()
}

export async function getSessionMessages(id: string): Promise<SessionMessage[]> {
  const res = await fetch(`${BASE}/api/sessions/${encodeName(id)}/messages`)
  if (!res.ok) throw new Error(`getSessionMessages failed: ${res.status}`)
  return res.json()
}

export async function saveSessionMessages(id: string, messages: SessionMessage[]): Promise<void> {
  const res = await fetch(`${BASE}/api/sessions/${encodeName(id)}/messages`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  })
  if (!res.ok) throw new Error(`saveSessionMessages failed: ${res.status}`)
}