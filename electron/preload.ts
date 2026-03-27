import { contextBridge, ipcRenderer, webUtils } from 'electron'

/**
 * 预加载脚本：通过 contextBridge 安全地向渲染进程暴露 Electron API
 *
 * 重要：contextBridge 会对返回值进行结构化克隆（Structured Clone），
 * 函数无法通过 contextBridge 传递回渲染进程，因此 onMenuAction 不能返回清理函数。
 * 改为在 preload 内部维护监听器引用，通过 removeMenuActionListener 清理。
 */

// 在 preload 作用域内保存当前的 menu:action 处理器引用
let currentMenuHandler: ((_event: Electron.IpcRendererEvent, action: string) => void) | null = null
// 保存 open-file 处理器引用，防止重复注册导致监听器泄漏
let currentOpenFileHandler: ((_event: Electron.IpcRendererEvent, filePath: string) => void) | null = null

contextBridge.exposeInMainWorld('electronAPI', {
  // ========== 拖拽文件路径获取 ==========
  getPathForFile: (file: File) => webUtils.getPathForFile(file),

  // ========== 文件操作 ==========
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  dropOpenFile: (filePath: string) => ipcRenderer.invoke('file:dropOpen', filePath),
  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('file:write', filePath, content),
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('file:save', filePath, content),
  saveFileAs: (content: string) => ipcRenderer.invoke('file:saveAs', content),

  // ========== 文件夹操作 ==========
  openFolder: () => ipcRenderer.invoke('folder:open'),
  readDir: (dirPath: string) => ipcRenderer.invoke('folder:readDir', dirPath),

  // ========== 文件管理操作 ==========
  createFile: (filePath: string) => ipcRenderer.invoke('file:create', filePath),
  createFolder: (folderPath: string) => ipcRenderer.invoke('folder:create', folderPath),
  deleteFile: (filePath: string) => ipcRenderer.invoke('file:delete', filePath),
  renameFile: (oldPath: string, newPath: string) => ipcRenderer.invoke('file:rename', oldPath, newPath),
  showItemInFolder: (filePath: string) => ipcRenderer.invoke('shell:showItemInFolder', filePath),
  openInNewWindow: (filePath: string) => ipcRenderer.invoke('app:openInNewWindow', filePath),

  // ========== 监听新窗口打开文件 ==========
  onOpenFile: (callback: (filePath: string) => void) => {
    // 先移除旧的监听器，防止重复注册
    if (currentOpenFileHandler) {
      ipcRenderer.removeListener('open-file', currentOpenFileHandler)
      currentOpenFileHandler = null
    }
    currentOpenFileHandler = (_event: Electron.IpcRendererEvent, filePath: string) => {
      callback(filePath)
    }
    ipcRenderer.on('open-file', currentOpenFileHandler)
  },

  // ========== 导出 ==========
  exportPdf: (filePath: string) => ipcRenderer.invoke('export:pdf', filePath),
  exportHtml: (filePath: string, html: string, css: string) =>
    ipcRenderer.invoke('export:html', filePath, html, css),
  exportHtmlPlain: (filePath: string, html: string) =>
    ipcRenderer.invoke('export:htmlPlain', filePath, html),

  // ========== 打印 ==========
  printPage: () => ipcRenderer.invoke('app:print'),

  // ========== 图片操作 ==========
  saveImage: (fileDir: string, base64Data: string, fileName: string) =>
    ipcRenderer.invoke('image:save', fileDir, base64Data, fileName),
  readImage: (imgPath: string) => ipcRenderer.invoke('image:read', imgPath),

  // ========== 对话框 ==========
  showMessageBox: (options: Electron.MessageBoxOptions) =>
    ipcRenderer.invoke('dialog:showMessageBox', options),
  showSaveDialog: (options: Electron.SaveDialogOptions) =>
    ipcRenderer.invoke('dialog:showSaveDialog', options),
  showOpenDialog: (options: Electron.OpenDialogOptions) =>
    ipcRenderer.invoke('dialog:showOpenDialog', options),

  // ========== 应用信息 ==========
  getAppPath: () => ipcRenderer.invoke('app:getPath'),
  setBackgroundColor: (color: string) => ipcRenderer.invoke('app:setBackgroundColor', color),

  // ========== 持久化存储 ==========
  storeGet: (key: string) => ipcRenderer.invoke('store:get', key),
  storeSet: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),

  // ========== 菜单事件监听 ==========
  onMenuAction: (callback: (action: string) => void) => {
    // 如果已有旧的监听器，先精确移除
    if (currentMenuHandler) {
      ipcRenderer.removeListener('menu:action', currentMenuHandler)
      currentMenuHandler = null
    }
    // 创建新的处理器并保存引用
    currentMenuHandler = (_event: Electron.IpcRendererEvent, action: string) => {
      callback(action)
    }
    ipcRenderer.on('menu:action', currentMenuHandler)
  },
  removeMenuActionListener: () => {
    if (currentMenuHandler) {
      ipcRenderer.removeListener('menu:action', currentMenuHandler)
      currentMenuHandler = null
    }
  },
})
