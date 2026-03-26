import { ipcMain, dialog } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

/** 支持的文件扩展名 */
const SUPPORTED_EXTENSIONS = new Set([
  '.md', '.markdown', '.mdown', '.mkd', '.txt', '.text',
])

interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  children?: FileEntry[]
}

/**
 * 注册文件夹相关的 IPC 处理器
 */
export function registerFolderIpc() {
  // 打开文件夹对话框
  ipcMain.handle('folder:open', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  // 递归读取目录
  ipcMain.handle('folder:readDir', async (_event, dirPath: string) => {
    try {
      return await readDirectory(dirPath)
    } catch (error) {
      console.error('Failed to read directory:', dirPath, error)
      throw error
    }
  })
}

/**
 * 递归读取目录结构
 */
async function readDirectory(dirPath: string): Promise<FileEntry[]> {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
  const result: FileEntry[] = []

  for (const entry of entries) {
    // 忽略隐藏文件和 node_modules
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue
    }

    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      const children = await readDirectory(fullPath)
      result.push({
        name: entry.name,
        path: fullPath,
        isDirectory: true,
        children,
      })
    } else {
      const ext = path.extname(entry.name).toLowerCase()
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        result.push({
          name: entry.name,
          path: fullPath,
          isDirectory: false,
        })
      }
    }
  }

  // 目录优先，然后按名称排序
  result.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1
    if (!a.isDirectory && b.isDirectory) return 1
    return a.name.localeCompare(b.name)
  })

  return result
}
