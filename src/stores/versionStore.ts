import { create } from 'zustand'

/** 单个版本快照 */
export interface VersionSnapshot {
  /** 唯一标识 */
  id: string
  /** 文件路径 */
  filePath: string
  /** 内容 */
  content: string
  /** 保存时间戳 */
  timestamp: number
  /** 文件名 */
  fileName: string
}

/** 每个文件的最大保存版本数 */
const MAX_VERSIONS_PER_FILE = 50

/** 最多保留版本历史的文件数量（防止内存持续增长） */
const MAX_FILES_WITH_VERSIONS = 10

interface VersionState {
  /** 版本历史（按文件路径分组） */
  versions: Record<string, VersionSnapshot[]>

  /** 记录一个版本快照 */
  addVersion: (filePath: string, fileName: string, content: string) => void

  /** 获取某文件的版本历史 */
  getVersions: (filePath: string) => VersionSnapshot[]

  /** 恢复到指定版本 */
  restoreVersion: (id: string) => VersionSnapshot | null

  /** 清除某文件的历史 */
  clearVersions: (filePath: string) => void
}

export const useVersionStore = create<VersionState>((set, get) => ({
  versions: {},

  addVersion: (filePath: string, fileName: string, content: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    const snapshot: VersionSnapshot = {
      id,
      filePath,
      content,
      timestamp: Date.now(),
      fileName,
    }

    set((state) => {
      const fileVersions = [...(state.versions[filePath] || []), snapshot]
      // 超过单文件限制则移除最旧的
      if (fileVersions.length > MAX_VERSIONS_PER_FILE) {
        fileVersions.splice(0, fileVersions.length - MAX_VERSIONS_PER_FILE)
      }

      const newVersions = {
        ...state.versions,
        [filePath]: fileVersions,
      }

      // 限制保留版本历史的文件数量，超出时移除最久未更新的文件
      const filePaths = Object.keys(newVersions)
      if (filePaths.length > MAX_FILES_WITH_VERSIONS) {
        // 找出最久未更新的文件（按最新快照时间排序）
        const sorted = filePaths
          .filter((p) => p !== filePath) // 当前文件不淘汰
          .map((p) => {
            const versions = newVersions[p]
            const latestTimestamp = versions.length > 0 ? versions[versions.length - 1].timestamp : 0
            return { path: p, latestTimestamp }
          })
          .sort((a, b) => a.latestTimestamp - b.latestTimestamp)

        // 移除最旧的文件，直到总数回到上限
        const removeCount = filePaths.length - MAX_FILES_WITH_VERSIONS
        for (let i = 0; i < removeCount && i < sorted.length; i++) {
          delete newVersions[sorted[i].path]
        }
      }

      return { versions: newVersions }
    })
  },

  getVersions: (filePath: string) => {
    return get().versions[filePath] || []
  },

  restoreVersion: (id: string) => {
    const allVersions = get().versions
    for (const filePath in allVersions) {
      const found = allVersions[filePath].find((v) => v.id === id)
      if (found) return found
    }
    return null
  },

  clearVersions: (filePath: string) => {
    set((state) => {
      const { [filePath]: _, ...rest } = state.versions
      return { versions: rest }
    })
  },
}))
