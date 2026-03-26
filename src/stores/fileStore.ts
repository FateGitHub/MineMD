import { create } from 'zustand'
import type { FileEntry } from '../types/index'

interface FileInfo {
  /** 文件路径（null 表示未保存的新文件） */
  filePath: string | null
  /** 文件名 */
  fileName: string
  /** 文件内容 */
  content: string
  /** 是否已修改 */
  isModified: boolean
}

interface FileState {
  /** 当前文件信息 */
  currentFile: FileInfo
  /** 当前打开的文件夹路径 */
  folderPath: string | null
  /** 文件树 */
  fileTree: FileEntry[]

  // 操作
  newFile: () => Promise<void>
  openFile: () => Promise<void>
  openFileByPath: (filePath: string) => Promise<void>
  saveCurrentFile: () => Promise<void>
  saveFileAs: () => Promise<void>
  updateContent: (content: string) => void
  openFolder: () => Promise<void>
  openFolderByPath: (folderPath: string) => Promise<void>
  refreshFileTree: () => Promise<void>
  /** 删除文件（移入回收站） */
  deleteFileByPath: (filePath: string) => Promise<void>
  /** 重命名文件 */
  renameFileByPath: (oldPath: string, newName: string) => Promise<void>
  /** 在指定目录下创建新文件 */
  createFileInDir: (dirPath: string, fileName: string) => Promise<void>
  /** 在指定目录下创建新文件夹 */
  createFolderInDir: (dirPath: string, folderName: string) => Promise<void>
  /** 恢复上次会话（启动时自动调用） */
  restoreLastSession: () => Promise<void>
}

/**
 * 弹出未保存确认对话框
 * @returns true=保存, false=不保存, null=取消操作
 */
async function confirmUnsavedChanges(fileName: string): Promise<boolean | null> {
  const result = await window.electronAPI.showMessageBox({
    type: 'warning',
    title: '未保存的更改',
    message: `"${fileName}" 尚未保存，是否保存？`,
    buttons: ['保存', '不保存', '取消'],
    defaultId: 0,
    cancelId: 2,
  })
  // response: 0=保存, 1=不保存, 2=取消
  if (result.response === 0) return true
  if (result.response === 1) return false
  return null
}

export const useFileStore = create<FileState>((set, get) => ({
  currentFile: {
    filePath: null,
    fileName: '未命名.md',
    content: '',
    isModified: false,
  },
  folderPath: null,
  fileTree: [],

  newFile: async () => {
    // 检查当前文件是否有未保存的修改
    const { currentFile } = get()
    if (currentFile.isModified) {
      const shouldProceed = await confirmUnsavedChanges(currentFile.fileName)
      if (shouldProceed === null) return // 用户取消
      if (shouldProceed) {
        // 用户选择保存
        await get().saveCurrentFile()
      }
      // shouldProceed === false 表示不保存，直接切换
    }
    set({
      currentFile: {
        filePath: null,
        fileName: '未命名.md',
        content: '',
        isModified: false,
      },
    })
  },

  openFile: async () => {
    try {
      // 检查当前文件是否有未保存的修改
      const { currentFile } = get()
      if (currentFile.isModified) {
        const shouldProceed = await confirmUnsavedChanges(currentFile.fileName)
        if (shouldProceed === null) return // 用户取消
        if (shouldProceed) {
          await get().saveCurrentFile()
        }
      }
      const result = await window.electronAPI.openFile()
      if (result) {
        const fileName = result.filePath.split(/[\\/]/).pop() || '未命名.md'
        set({
          currentFile: {
            filePath: result.filePath,
            fileName,
            content: result.content,
            isModified: false,
          },
        })
        // 持久化保存当前文件路径
        window.electronAPI.storeSet('lastFilePath', result.filePath)
      }
    } catch (error) {
      console.error('Failed to open file:', error)
    }
  },

  openFileByPath: async (filePath: string) => {
    try {
      // 如果点击的就是当前文件，无需操作
      const { currentFile } = get()
      if (currentFile.filePath === filePath) return

      // 检查当前文件是否有未保存的修改
      if (currentFile.isModified) {
        const shouldProceed = await confirmUnsavedChanges(currentFile.fileName)
        if (shouldProceed === null) return // 用户取消
        if (shouldProceed) {
          await get().saveCurrentFile()
        }
      }

      const content = await window.electronAPI.readFile(filePath)
      const fileName = filePath.split(/[\\/]/).pop() || '未命名.md'
      set({
        currentFile: {
          filePath,
          fileName,
          content,
          isModified: false,
        },
      })
      // 持久化保存当前文件路径
      window.electronAPI.storeSet('lastFilePath', filePath)
    } catch (error) {
      console.error('Failed to open file by path:', error)
    }
  },

  saveCurrentFile: async () => {
    const { currentFile } = get()
    if (currentFile.filePath) {
      try {
        await window.electronAPI.saveFile(currentFile.filePath, currentFile.content)
        set({
          currentFile: { ...currentFile, isModified: false },
        })
      } catch (error) {
        console.error('Failed to save file:', error)
      }
    } else {
      // 没有文件路径，调用另存为
      await get().saveFileAs()
    }
  },

  saveFileAs: async () => {
    const { currentFile } = get()
    try {
      const filePath = await window.electronAPI.saveFileAs(currentFile.content)
      if (filePath) {
        const fileName = filePath.split(/[\\/]/).pop() || '未命名.md'
        set({
          currentFile: {
            ...currentFile,
            filePath,
            fileName,
            isModified: false,
          },
        })
      }
    } catch (error) {
      console.error('Failed to save file as:', error)
    }
  },

  updateContent: (content: string) => {
    set((state) => ({
      currentFile: {
        ...state.currentFile,
        content,
        isModified: true,
      },
    }))
  },

  openFolder: async () => {
    try {
      const folderPath = await window.electronAPI.openFolder()
      if (folderPath) {
        set({ folderPath })
        await get().refreshFileTree()
        // 持久化保存当前文件夹路径
        window.electronAPI.storeSet('lastFolderPath', folderPath)
      }
    } catch (error) {
      console.error('Failed to open folder:', error)
    }
  },

  openFolderByPath: async (folderPath: string) => {
    try {
      set({ folderPath })
      await get().refreshFileTree()
      // 持久化保存当前文件夹路径
      window.electronAPI.storeSet('lastFolderPath', folderPath)
    } catch (error) {
      console.error('Failed to open folder by path:', error)
    }
  },

  refreshFileTree: async () => {
    const { folderPath } = get()
    if (!folderPath) return
    try {
      const fileTree = await window.electronAPI.readDir(folderPath)
      set({ fileTree })
    } catch (error) {
      console.error('Failed to refresh file tree:', error)
    }
  },

  deleteFileByPath: async (filePath: string) => {
    try {
      // 弹出确认对话框
      const result = await window.electronAPI.showMessageBox({
        type: 'warning',
        title: '确认删除',
        message: `确定要将文件移入回收站吗？\n${filePath.split(/[\\/]/).pop()}`,
        buttons: ['移入回收站', '取消'],
        defaultId: 1,
        cancelId: 1,
      })

      if (result.response !== 0) return

      await window.electronAPI.deleteFile(filePath)

      // 如果删除的是当前打开的文件，重置为新文件
      const { currentFile } = get()
      if (currentFile.filePath === filePath) {
        set({
          currentFile: {
            filePath: null,
            fileName: '未命名.md',
            content: '',
            isModified: false,
          },
        })
      }

      // 刷新文件树
      await get().refreshFileTree()
    } catch (error) {
      console.error('删除文件失败:', error)
    }
  },

  renameFileByPath: async (oldPath: string, newName: string) => {
    try {
      const dir = oldPath.substring(0, oldPath.lastIndexOf(oldPath.includes('/') ? '/' : '\\') + 1)
      const newPath = dir + newName

      // 检查新文件名是否和旧文件名相同
      const oldName = oldPath.split(/[\\/]/).pop() || ''
      if (oldName === newName) return

      await window.electronAPI.renameFile(oldPath, newPath)

      // 如果重命名的是当前打开的文件，更新状态
      const { currentFile } = get()
      if (currentFile.filePath === oldPath) {
        set({
          currentFile: {
            ...currentFile,
            filePath: newPath,
            fileName: newName,
          },
        })
        // 更新持久化路径
        window.electronAPI.storeSet('lastFilePath', newPath)
      }

      // 刷新文件树
      await get().refreshFileTree()
    } catch (error) {
      console.error('重命名文件失败:', error)
      // 提示用户
      window.electronAPI.showMessageBox({
        type: 'error',
        title: '重命名失败',
        message: `无法重命名文件：${(error as Error).message || '未知错误'}`,
        buttons: ['确定'],
      })
    }
  },

  createFileInDir: async (dirPath: string, fileName: string) => {
    try {
      if (!fileName.trim()) return

      let finalName = fileName.trim()
      // 如果用户没有输入扩展名，自动补上 .md
      if (!finalName.includes('.')) {
        finalName += '.md'
      }

      const sep = dirPath.includes('/') ? '/' : '\\'
      const filePath = dirPath + sep + finalName

      await window.electronAPI.createFile(filePath)

      // 刷新文件树
      await get().refreshFileTree()

      // 自动打开新建的文件
      await get().openFileByPath(filePath)
    } catch (error) {
      console.error('新建文件失败:', error)
      window.electronAPI.showMessageBox({
        type: 'error',
        title: '新建文件失败',
        message: `无法创建文件：${(error as Error).message || '未知错误'}`,
        buttons: ['确定'],
      })
    }
  },

  createFolderInDir: async (dirPath: string, folderName: string) => {
    try {
      if (!folderName.trim()) return

      const sep = dirPath.includes('/') ? '/' : '\\'
      const folderPath = dirPath + sep + folderName.trim()

      await window.electronAPI.createFolder(folderPath)

      // 刷新文件树
      await get().refreshFileTree()
    } catch (error) {
      console.error('新建文件夹失败:', error)
      window.electronAPI.showMessageBox({
        type: 'error',
        title: '新建文件夹失败',
        message: `无法创建文件夹：${(error as Error).message || '未知错误'}`,
        buttons: ['确定'],
      })
    }
  },

  restoreLastSession: async () => {
    try {
      // 恢复上次打开的文件夹
      const lastFolderPath = (await window.electronAPI.storeGet('lastFolderPath')) as string | null
      if (lastFolderPath) {
        set({ folderPath: lastFolderPath })
        await get().refreshFileTree()
      }

      // 恢复上次打开的文件
      const lastFilePath = (await window.electronAPI.storeGet('lastFilePath')) as string | null
      if (lastFilePath) {
        try {
          const content = await window.electronAPI.readFile(lastFilePath)
          const fileName = lastFilePath.split(/[\\/]/).pop() || '未命名.md'
          set({
            currentFile: {
              filePath: lastFilePath,
              fileName,
              content,
              isModified: false,
            },
          })
        } catch {
          // 文件可能已被删除或移动，忽略错误
          console.warn('上次打开的文件不存在:', lastFilePath)
        }
      }
    } catch (error) {
      console.error('恢复上次会话失败:', error)
    }
  },
}))
