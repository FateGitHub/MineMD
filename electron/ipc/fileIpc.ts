import { ipcMain, dialog } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

/**
 * 注册文件相关的 IPC 处理器
 */
export function registerFileIpc() {
  // 读取文件
  ipcMain.handle('file:read', async (_event, filePath: string) => {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8')
      return content
    } catch (error) {
      console.error('Failed to read file:', filePath, error)
      throw error
    }
  })

  // 写入文件
  ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
    try {
      await fs.promises.writeFile(filePath, content, 'utf-8')
    } catch (error) {
      console.error('Failed to write file:', filePath, error)
      throw error
    }
  })

  // 打开文件对话框
  ipcMain.handle('file:open', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd'] },
        { name: '文本文件', extensions: ['txt', 'text'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const filePath = result.filePaths[0]
    const content = await fs.promises.readFile(filePath, 'utf-8')
    return { filePath, content }
  })

  // 保存文件
  ipcMain.handle('file:save', async (_event, filePath: string, content: string) => {
    try {
      await fs.promises.writeFile(filePath, content, 'utf-8')
      return filePath
    } catch (error) {
      console.error('Failed to save file:', filePath, error)
      throw error
    }
  })

  // 另存为
  ipcMain.handle('file:saveAs', async (_event, content: string) => {
    const result = await dialog.showSaveDialog({
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: '文本文件', extensions: ['txt'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    })

    if (result.canceled || !result.filePath) {
      return null
    }

    await fs.promises.writeFile(result.filePath, content, 'utf-8')
    return result.filePath
  })
}
