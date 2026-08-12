// P4-4: 全局快捷键体系（在 ToastProvider 内使用，以便 save 反馈走 Toast）。
// - 空格: 播放/停止走带
// - Home: 回到开头（停止）
// - Ctrl/⌘+S: 保存当前轨道音符
// - Alt+1~4: 切换工作区 Tab（工程/分轨/文件/技能）
// - ?: 打开/关闭快捷键帮助; Esc: 关闭帮助
import { useEffect } from 'react'
import { useProjectStore } from '../store/projectStore'
import { useUiStore } from '../store/uiStore'
import { useTrackStore } from '../store/trackStore'
import { useTransportStore } from '../store/transportStore'
import { saveTrackNotes } from '../services/api'
import { useToast } from '../components/common/Toast'

export function useGlobalShortcuts(onToggleHelp: () => void) {
  const toast = useToast()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null
      const tag = (el?.tagName || '').toUpperCase()
      const typing =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!el?.isContentEditable

      // Ctrl/⌘+S 保存（即使聚焦输入框也允许）
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        const { currentProject } = useProjectStore.getState()
        const { selectedTrackId } = useUiStore.getState()
        if (!currentProject || !selectedTrackId) {
          toast.info('未选择工程/轨道，无可保存')
          return
        }
        const key = `${currentProject}::${selectedTrackId}`
        const notes = useTrackStore.getState().byKey[key]
        if (!notes) {
          toast.info('该轨道暂无音符数据')
          return
        }
        saveTrackNotes(currentProject, selectedTrackId, notes)
          .then(() => toast.success('已保存音符到工程'))
          .catch((err: any) => toast.error(`保存失败：${err?.message || err}`))
        return
      }

      // 输入态下仅响应 Esc（关闭帮助）——其余全局键让位给文本编辑
      if (typing) {
        if (e.key === 'Escape') onToggleHelp()
        return
      }

      if (e.key === ' ') {
        e.preventDefault()
        useTransportStore.getState().toggle()
        return
      }
      if (e.key === 'Home') {
        e.preventDefault()
        useTransportStore.getState().stop()
        return
      }
      if (e.altKey && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        const map: Record<string, '工程' | '分轨' | '文件' | '技能'> = {
          '1': '工程',
          '2': '分轨',
          '3': '文件',
          '4': '技能',
        }
        useUiStore.getState().setActiveTab(map[e.key])
        return
      }
      if (e.key === '?') {
        e.preventDefault()
        onToggleHelp()
        return
      }
      if (e.key === 'Escape') {
        onToggleHelp()
        return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onToggleHelp, toast])
}
