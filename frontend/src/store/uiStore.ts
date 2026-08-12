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
      splitRatio: 40,
      setSplitRatio: (r) => set({ splitRatio: Math.max(20, Math.min(80, r)) }),
    }),
    { name: 'ai-music-ui' },
  ),
)
