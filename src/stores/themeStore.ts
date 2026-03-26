import { create } from 'zustand'
import type { Theme } from '../types/index'

// 重新导出类型，保持向后兼容
export type { Theme }

interface ThemeState {
  theme: Theme
  fontSize: number
  fontFamily: string
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setFontSize: (size: number) => void
  setFontFamily: (family: string) => void
}

/** 将主题相关设置持久化到 Electron 存储 */
function persistThemeSettings(partial: Partial<{ theme: Theme; fontSize: number; fontFamily: string }>) {
  if (window.electronAPI) {
    if (partial.theme !== undefined) {
      window.electronAPI.storeSet('theme', partial.theme)
    }
    if (partial.fontSize !== undefined) {
      window.electronAPI.storeSet('fontSize', partial.fontSize)
    }
    if (partial.fontFamily !== undefined) {
      window.electronAPI.storeSet('fontFamily', partial.fontFamily)
    }
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  fontSize: 16,
  fontFamily: 'system-ui, -apple-system, sans-serif',

  setTheme: (theme) => {
    set({ theme })
    persistThemeSettings({ theme })
  },

  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light'
    set({ theme: next })
    persistThemeSettings({ theme: next })
  },

  setFontSize: (fontSize) => {
    set({ fontSize })
    persistThemeSettings({ fontSize })
  },

  setFontFamily: (fontFamily) => {
    set({ fontFamily })
    persistThemeSettings({ fontFamily })
  },
}))

/**
 * 从 Electron 持久化存储恢复主题设置
 * 应在应用初始化时调用一次
 */
export async function restoreThemeSettings() {
  if (!window.electronAPI) return

  try {
    const [savedTheme, savedFontSize, savedFontFamily] = await Promise.all([
      window.electronAPI.storeGet('theme'),
      window.electronAPI.storeGet('fontSize'),
      window.electronAPI.storeGet('fontFamily'),
    ])

    const patch: Partial<{ theme: Theme; fontSize: number; fontFamily: string }> = {}

    if (savedTheme === 'light' || savedTheme === 'dark') {
      patch.theme = savedTheme
    }
    if (typeof savedFontSize === 'number' && savedFontSize > 0) {
      patch.fontSize = savedFontSize
    }
    if (typeof savedFontFamily === 'string' && savedFontFamily.length > 0) {
      patch.fontFamily = savedFontFamily
    }

    if (Object.keys(patch).length > 0) {
      useThemeStore.setState(patch)
    }
  } catch (error) {
    console.error('恢复主题设置失败:', error)
  }
}
