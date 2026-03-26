import { create } from 'zustand'
import type { ViewMode, SidebarTab, WordCount } from '../types/index'

// 重新导出类型，保持向后兼容
export type { ViewMode, SidebarTab, WordCount }

interface EditorState {
  /** 当前视图模式 */
  viewMode: ViewMode
  /** 侧边栏是否可见 */
  sidebarVisible: boolean
  /** 当前侧边栏标签页 */
  sidebarTab: SidebarTab
  /** 字数统计 */
  wordCount: WordCount
  /** 选区字数统计（null 表示无选区） */
  selectionWordCount: WordCount | null
  /** 缩放比例 */
  zoomLevel: number
  /** 快速打开弹窗是否可见 */
  quickOpenVisible: boolean
  /** 全局搜索弹窗是否可见 */
  globalSearchVisible: boolean
  /** 版本历史弹窗是否可见 */
  versionHistoryVisible: boolean
  /** 实时预览模式分屏比例（0~1，表示编辑器占比） */
  splitRatio: number

  // 操作
  setViewMode: (mode: ViewMode) => void
  setSplitRatio: (ratio: number) => void
  toggleSidebar: () => void
  setSidebarTab: (tab: SidebarTab) => void
  setWordCount: (count: WordCount) => void
  setSelectionWordCount: (count: WordCount | null) => void
  zoomIn: () => void
  zoomOut: () => void
  zoomReset: () => void
  setQuickOpenVisible: (visible: boolean) => void
  setGlobalSearchVisible: (visible: boolean) => void
  setVersionHistoryVisible: (visible: boolean) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  viewMode: 'live',
  sidebarVisible: true,
  sidebarTab: 'files',
  wordCount: { characters: 0, words: 0, lines: 0, paragraphs: 0 },
  selectionWordCount: null,
  zoomLevel: 100,
  quickOpenVisible: false,
  globalSearchVisible: false,
  versionHistoryVisible: false,
  splitRatio: 0.5,

  setViewMode: (viewMode) => set({ viewMode }),

  setSplitRatio: (splitRatio) => set({ splitRatio: Math.max(0.2, Math.min(0.8, splitRatio)) }),

  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),

  setSidebarTab: (sidebarTab) => set({ sidebarTab }),

  setWordCount: (wordCount) => set({ wordCount }),

  setSelectionWordCount: (selectionWordCount) => set({ selectionWordCount }),

  zoomIn: () => {
    const level = Math.min(get().zoomLevel + 10, 200)
    set({ zoomLevel: level })
  },

  zoomOut: () => {
    const level = Math.max(get().zoomLevel - 10, 50)
    set({ zoomLevel: level })
  },

  zoomReset: () => set({ zoomLevel: 100 }),

  setQuickOpenVisible: (quickOpenVisible) => set({ quickOpenVisible }),

  setGlobalSearchVisible: (globalSearchVisible) => set({ globalSearchVisible }),

  setVersionHistoryVisible: (versionHistoryVisible) => set({ versionHistoryVisible }),
}))
