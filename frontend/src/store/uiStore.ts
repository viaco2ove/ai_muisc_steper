import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type WorkspaceTab = '工程' | '分轨' | '文件' | '技能'

interface UiState {
  activeTab: WorkspaceTab
  setActiveTab: (tab: WorkspaceTab) => void
  // 分轨 Tab 内选中的轨道（主从布局）
  selectedTrackId: string | null
  setSelectedTrackId: (id: string | null) => void
  // 脏检查：已修改未保存的轨道 id 集合（切轨/切工程拦截用）
  dirtyTracks: Record<string, boolean>
  markDirty: (id: string) => void
  clearDirty: (id: string) => void
  // P4-3: 左聊天 / 右工作区分栏比例（百分比，持久化）
  splitRatio: number
  setSplitRatio: (r: number) => void
  // 聊天面板是否折叠（点击工具栏可恢复）
  chatCollapsed: boolean
  setChatCollapsed: (v: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      activeTab: '工程',
      setActiveTab: (tab) => set({ activeTab: tab }),
      selectedTrackId: null,
      setSelectedTrackId: (id) => set({ selectedTrackId: id }),
      dirtyTracks: {},
      markDirty: (id) => set((s) => ({ dirtyTracks: { ...s.dirtyTracks, [id]: true } })),
      clearDirty: (id) =>
        set((s) => {
          const next = { ...s.dirtyTracks }
          delete next[id]
          return { dirtyTracks: next }
        }),
      splitRatio: 30,
      setSplitRatio: (r) => set({ splitRatio: Math.max(20, Math.min(80, r)) }),
      chatCollapsed: false,
      setChatCollapsed: (v) => set({ chatCollapsed: v }),
    }),
    {
      name: 'ai-music-ui',
      partialize: (state) => ({
        activeTab: state.activeTab,
        selectedTrackId: state.selectedTrackId,
        splitRatio: state.splitRatio,
        dirtyTracks: state.dirtyTracks,
        // 不持久化 chatCollapsed，避免旧值残留导致 AI 助手消失
      }),
    },
  ),
)
