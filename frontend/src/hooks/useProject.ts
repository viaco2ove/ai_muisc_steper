import { useState, useEffect, useCallback } from 'react'
import { getProject, listProjects } from '../services/api'
import type { ProjectListItem, ProjectData } from '../store/projectStore'

export function useProject(name: string | null) {
  const [data, setData] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!name) return
    setLoading(true)
    setError(null)
    try {
      const d = await getProject(name)
      setData(d)
    } catch (e: any) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [name])

  useEffect(() => { refresh() }, [refresh])

  return { data, loading, error, refresh }
}

export function useProjectList() {
  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const list = await listProjects()
      setProjects(list)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { projects, loading, refresh }
}
