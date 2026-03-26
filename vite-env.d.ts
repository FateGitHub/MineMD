/// <reference types="vite/client" />

// Electron preload 暴露的 API 类型声明
interface ElectronAPI {
  // 文件操作
  readFile: (filePath: string) => Promise<string>
  writeFile: (filePath: string, content: string) => Promise<void>
  openFile: () => Promise<{ filePath: string; content: string } | null>
  saveFile: (filePath: string, content: string) => Promise<string>
  saveFileAs: (content: string) => Promise<string | null>

  // 文件夹操作
  openFolder: () => Promise<string | null>
  readDir: (dirPath: string) => Promise<FileEntry[]>

  // 文件管理操作
  createFile: (filePath: string) => Promise<string>
  createFolder: (folderPath: string) => Promise<string>
  deleteFile: (filePath: string) => Promise<boolean>
  renameFile: (oldPath: string, newPath: string) => Promise<string>
  showItemInFolder: (filePath: string) => Promise<void>
  openInNewWindow: (filePath: string) => Promise<void>

  // 监听新窗口打开文件
  onOpenFile: (callback: (filePath: string) => void) => void

  // 导出
  exportPdf: (filePath: string) => Promise<string | null>
  exportHtml: (filePath: string, html: string, css: string) => Promise<string | null>
  exportHtmlPlain: (filePath: string, html: string) => Promise<string | null>

  // 打印
  printPage: () => Promise<void>

  // 图片操作
  saveImage: (fileDir: string, base64Data: string, fileName: string) => Promise<string>
  readImage: (imgPath: string) => Promise<string | null>

  // 对话框
  showMessageBox: (options: Electron.MessageBoxOptions) => Promise<Electron.MessageBoxReturnValue>
  showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>
  showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>

  // 应用信息
  getAppPath: () => Promise<string>
  setBackgroundColor: (color: string) => Promise<void>

  // 持久化存储
  storeGet: (key: string) => Promise<unknown>
  storeSet: (key: string, value: unknown) => Promise<void>

  // 事件监听
  onMenuAction: (callback: (action: string) => void) => void
  removeMenuActionListener: () => void
}

interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  children?: FileEntry[]
}

interface Window {
  electronAPI: ElectronAPI
}
