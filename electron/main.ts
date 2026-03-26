import { app, BrowserWindow, ipcMain, dialog, session, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createMenu } from './menu'
import { registerFileIpc } from './ipc/fileIpc'
import { registerFolderIpc } from './ipc/folderIpc'
import { registerExportIpc } from './ipc/exportIpc'
import { registerStoreIpc } from './ipc/storeIpc'

// ES Module 中没有 __dirname，需要手动构造
const __filename_esm = fileURLToPath(import.meta.url)
const __dirname_electron = path.dirname(__filename_esm)
// dist 目录（Vite 打包后的渲染进程）
const RENDERER_DIST = path.join(__dirname_electron, '../dist')
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 500,
    minHeight: 350,
    icon: path.join(__dirname_electron, '../resources/icon.png'),
    webPreferences: {
      preload: path.join(__dirname_electron, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    // Typora 风格：macOS 使用隐藏式标题栏
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    // Windows 上也可以用无框模式，但保留系统边框更稳定
    frame: true,
    show: false,
    backgroundColor: '#ffffff',
  })

  // 窗口准备好后再显示，避免白屏闪烁
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // 创建应用菜单
  createMenu(mainWindow)

  // 加载页面
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/**
 * 注册全局安全策略（CSP + 防盗链）
 * 使用 session.defaultSession，对所有窗口（包括新打开的窗口）统一生效。
 * 仅需注册一次。
 */
function registerSecurityPolicy() {
  // 设置 CSP：允许加载外部网络图片
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; img-src 'self' data: blob: https: http:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' ws: wss: http: https:;",
        ],
      },
    })
  })

  // 拦截外部图片请求：移除 Referer 头，解决防盗链问题
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://*/*', 'http://*/*'] },
    (details, callback) => {
      const { requestHeaders } = details
      delete requestHeaders['Referer']
      delete requestHeaders['Origin']
      callback({ requestHeaders })
    },
  )
}

// 注册所有 IPC 处理器
function registerIpcHandlers() {
  registerFileIpc()
  registerFolderIpc()
  registerExportIpc()
  registerStoreIpc()

  // 显示消息弹窗
  ipcMain.handle('dialog:showMessageBox', async (_event, options) => {
    return dialog.showMessageBox(options)
  })

  // 显示保存对话框
  ipcMain.handle('dialog:showSaveDialog', async (_event, options) => {
    return dialog.showSaveDialog(options)
  })

  // 显示打开文件对话框
  ipcMain.handle('dialog:showOpenDialog', async (_event, options) => {
    return dialog.showOpenDialog(options)
  })

  // 获取应用路径
  ipcMain.handle('app:getPath', async () => {
    return app.getAppPath()
  })

  // 保存图片到 assets 目录
  ipcMain.handle(
    'image:save',
    async (_event, fileDir: string, base64Data: string, fileName: string) => {
      try {
        const assetsDir = path.join(fileDir, 'assets')
        // 确保 assets 目录存在
        await fs.promises.mkdir(assetsDir, { recursive: true })
        const filePath = path.join(assetsDir, fileName)
        // base64 数据可能包含前缀 "data:image/png;base64,"，需要去除
        const base64Str = base64Data.replace(/^data:image\/\w+;base64,/, '')
        const buffer = Buffer.from(base64Str, 'base64')
        await fs.promises.writeFile(filePath, buffer)
        return filePath
      } catch (error) {
        console.error('Failed to save image:', error)
        throw error
      }
    },
  )

  // 读取本地图片文件，返回 base64 data URL
  ipcMain.handle('image:read', async (_event, imgPath: string) => {
    try {
      const buffer = await fs.promises.readFile(imgPath)
      // 根据扩展名确定 MIME 类型
      const ext = path.extname(imgPath).toLowerCase()
      const mimeMap: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.bmp': 'image/bmp',
        '.ico': 'image/x-icon',
      }
      const mime = mimeMap[ext] || 'image/png'
      return `data:${mime};base64,${buffer.toString('base64')}`
    } catch (error) {
      console.error('Failed to read image:', imgPath, error)
      return null
    }
  })

  // 打印当前页面
  ipcMain.handle('app:print', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      win.webContents.print({ silent: false, printBackground: true })
    }
  })

  // 新建文件
  ipcMain.handle('file:create', async (_event, filePath: string) => {
    try {
      // 确保父目录存在
      const dir = path.dirname(filePath)
      await fs.promises.mkdir(dir, { recursive: true })
      // 创建空文件（如果已存在则报错）
      await fs.promises.writeFile(filePath, '', { flag: 'wx' })
      return filePath
    } catch (error) {
      console.error('Failed to create file:', filePath, error)
      throw error
    }
  })

  // 新建文件夹
  ipcMain.handle('folder:create', async (_event, folderPath: string) => {
    try {
      await fs.promises.mkdir(folderPath, { recursive: false })
      return folderPath
    } catch (error) {
      console.error('Failed to create folder:', folderPath, error)
      throw error
    }
  })

  // 在系统文件管理器中显示文件
  ipcMain.handle('shell:showItemInFolder', async (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  // 删除文件（移入回收站）
  ipcMain.handle('file:delete', async (_event, filePath: string) => {
    try {
      await shell.trashItem(filePath)
      return true
    } catch (error) {
      console.error('Failed to delete file:', filePath, error)
      throw error
    }
  })

  // 重命名文件
  ipcMain.handle('file:rename', async (_event, oldPath: string, newPath: string) => {
    try {
      await fs.promises.rename(oldPath, newPath)
      return newPath
    } catch (error) {
      console.error('Failed to rename file:', oldPath, error)
      throw error
    }
  })

  // 在新窗口中打开文件
  ipcMain.handle('app:openInNewWindow', async (_event, filePath: string) => {
    const newWindow = new BrowserWindow({
      width: 1100,
      height: 750,
      minWidth: 500,
      minHeight: 350,
      icon: path.join(__dirname_electron, '../resources/icon.png'),
      webPreferences: {
        preload: path.join(__dirname_electron, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
      },
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      frame: true,
      show: false,
      backgroundColor: '#ffffff',
    })

    newWindow.once('ready-to-show', () => {
      newWindow.show()
    })

    // 加载页面
    if (VITE_DEV_SERVER_URL) {
      await newWindow.loadURL(VITE_DEV_SERVER_URL)
    } else {
      await newWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
    }

    // 通过 IPC 通知新窗口打开指定文件
    newWindow.webContents.send('open-file', filePath)

    // 创建应用菜单
    createMenu(newWindow)
  })
}

app.whenReady().then(() => {
  registerSecurityPolicy()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
