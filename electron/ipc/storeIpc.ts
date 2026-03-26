import { ipcMain, app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

/**
 * 应用持久化存储模块
 * 使用 JSON 文件存储在 userData 目录中，不引入额外依赖
 *
 * 优化：使用内存缓存，避免每次 get/set 都读写完整 JSON 文件。
 * - get 操作直接读内存缓存
 * - set 操作写入缓存后延迟写盘（防抖 500ms）
 */

const STORE_FILE = path.join(app.getPath('userData'), 'app-state.json')

/** 内存缓存 */
let storeCache: Record<string, unknown> | null = null

/** 防抖写盘定时器 */
let writeTimer: ReturnType<typeof setTimeout> | null = null

/** 防抖延迟（毫秒） */
const WRITE_DEBOUNCE = 500

/** 从磁盘读取存储（仅首次或缓存为空时调用） */
export function loadStore(): Record<string, unknown> {
  if (storeCache !== null) return storeCache
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = fs.readFileSync(STORE_FILE, 'utf-8')
      storeCache = JSON.parse(data)
      return storeCache!
    }
  } catch (error) {
    console.error('读取应用状态失败:', error)
  }
  storeCache = {}
  return storeCache
}

/** 延迟写盘（防抖），避免短时间内多次写入 */
function scheduleSave() {
  if (writeTimer) clearTimeout(writeTimer)
  writeTimer = setTimeout(() => {
    writeTimer = null
    if (storeCache === null) return
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify(storeCache, null, 2), 'utf-8')
    } catch (error) {
      console.error('保存应用状态失败:', error)
    }
  }, WRITE_DEBOUNCE)
}

/**
 * 注册持久化存储相关的 IPC 处理器
 */
export function registerStoreIpc() {
  // 获取存储的值（从内存缓存读取）
  ipcMain.handle('store:get', async (_event, key: string) => {
    const store = loadStore()
    return store[key] ?? null
  })

  // 设置存储的值（写入缓存 + 延迟写盘）
  ipcMain.handle('store:set', async (_event, key: string, value: unknown) => {
    const store = loadStore()
    store[key] = value
    scheduleSave()
  })
}
