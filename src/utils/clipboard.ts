import { EditorView } from '@codemirror/view'
import { markdownToHtmlSync } from '../editor/markdown/parser'
import { useFileStore } from '../stores/fileStore'

/**
 * 智能剪贴板工具
 * 提供 Markdown 与 HTML 之间的智能复制/粘贴功能
 */

/**
 * 生成时间戳文件名
 */
function generateImageFileName(ext: string = 'png'): string {
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `image-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.${ext}`
}

/**
 * 获取当前文件所在目录（用于确定 assets 的存放位置）
 * 如果文件未保存，返回 null
 */
function getCurrentFileDir(): string | null {
  const { currentFile } = useFileStore.getState()
  if (!currentFile.filePath) return null
  // 统一使用正斜杠，从归一化后的路径中提取目录
  const normalized = currentFile.filePath.replace(/\\/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  return lastSlash >= 0 ? normalized.substring(0, lastSlash) : null
}

/**
 * 将剪贴板图片保存到 assets 目录，返回相对路径
 */
async function saveClipboardImage(blob: Blob): Promise<string | null> {
  const fileDir = getCurrentFileDir()
  if (!fileDir) return null

  try {
    // 将 Blob 转为 base64
    const arrayBuffer = await blob.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    let binaryStr = ''
    for (let i = 0; i < uint8Array.length; i++) {
      binaryStr += String.fromCharCode(uint8Array[i])
    }
    const base64 = btoa(binaryStr)

    // 根据 MIME 类型确定扩展名
    const ext = blob.type === 'image/jpeg' ? 'jpg'
      : blob.type === 'image/gif' ? 'gif'
      : blob.type === 'image/webp' ? 'webp'
      : 'png'

    const fileName = generateImageFileName(ext)
    await window.electronAPI.saveImage(fileDir, base64, fileName)

    // 返回相对路径（Markdown 中使用相对路径引用）
    return `assets/${fileName}`
  } catch (error) {
    console.error('保存剪贴板图片失败:', error)
    return null
  }
}

/**
 * 复制选中内容为 Markdown 源码 (Shift+Ctrl+C)
 */
export function copyAsMarkdown(view: EditorView): boolean {
  const { state } = view
  const range = state.selection.main
  if (range.empty) return false

  const text = state.sliceDoc(range.from, range.to)
  navigator.clipboard.writeText(text)
  return true
}

/**
 * 复制选中内容为 HTML
 */
export function copyAsHtml(view: EditorView): boolean {
  const { state } = view
  const range = state.selection.main
  if (range.empty) return false

  const text = state.sliceDoc(range.from, range.to)
  try {
    const html = markdownToHtmlSync(text)
    // 使用 Clipboard API 写入 HTML 和纯文本两种格式
    const blob = new Blob([html], { type: 'text/html' })
    const textBlob = new Blob([text], { type: 'text/plain' })
    const clipboardItem = new ClipboardItem({
      'text/html': blob,
      'text/plain': textBlob,
    })
    navigator.clipboard.write([clipboardItem])
  } catch {
    // 降级为纯文本
    navigator.clipboard.writeText(text)
  }
  return true
}

/**
 * 粘贴为纯文本 (Shift+Ctrl+V)
 */
export async function pasteAsPlainText(view: EditorView): Promise<boolean> {
  try {
    const text = await navigator.clipboard.readText()
    if (!text) return false

    const { state } = view
    const range = state.selection.main

    view.dispatch({
      changes: { from: range.from, to: range.to, insert: text },
      selection: { anchor: range.from + text.length },
      scrollIntoView: true,
    })
    return true
  } catch {
    return false
  }
}

/**
 * 智能粘贴：自动检测剪贴板内容格式
 * - 如果是截图/图片，保存到 assets 目录并插入 Markdown 图片引用
 * - 如果是 URL，包裹为 Markdown 链接
 * - 如果包含 HTML 表格，尝试转为 Markdown 表格
 * - 其他情况直接粘贴
 */
export async function smartPaste(view: EditorView): Promise<boolean> {
  try {
    const clipboardItems = await navigator.clipboard.read()
    const { state } = view
    const range = state.selection.main
    const selectedText = state.sliceDoc(range.from, range.to)

    // 优先检查是否有图片数据（截图粘贴）
    for (const item of clipboardItems) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type)
          const relativePath = await saveClipboardImage(blob)
          if (relativePath) {
            const insert = `![${selectedText || '图片'}](${relativePath})`
            view.dispatch({
              changes: { from: range.from, to: range.to, insert },
              selection: { anchor: range.from + insert.length },
              scrollIntoView: true,
            })
            return true
          } else {
            // 文件未保存，无法确定 assets 目录，提示用户
            console.warn('无法保存截图：请先保存当前文件')
            return false
          }
        }
      }
    }

    // 检查是否有纯文本
    let plainText = ''
    for (const item of clipboardItems) {
      if (item.types.includes('text/plain')) {
        const blob = await item.getType('text/plain')
        plainText = await blob.text()
        break
      }
    }

    if (!plainText) return false

    // 如果是 URL 且有选中文本，生成 Markdown 链接
    const urlPattern = /^https?:\/\/\S+$/
    if (urlPattern.test(plainText.trim())) {
      if (selectedText) {
        const insert = `[${selectedText}](${plainText.trim()})`
        view.dispatch({
          changes: { from: range.from, to: range.to, insert },
          selection: { anchor: range.from + insert.length },
          scrollIntoView: true,
        })
        return true
      } else {
        const insert = `[](${plainText.trim()})`
        view.dispatch({
          changes: { from: range.from, to: range.to, insert },
          selection: { anchor: range.from + 1 },
          scrollIntoView: true,
        })
        return true
      }
    }

    // 如果是图片 URL，生成图片标记
    const imgPattern = /^https?:\/\/\S+\.(png|jpg|jpeg|gif|webp|svg|bmp|ico)(\?.*)?$/i
    if (imgPattern.test(plainText.trim())) {
      const insert = `![${selectedText || '图片'}](${plainText.trim()})`
      view.dispatch({
        changes: { from: range.from, to: range.to, insert },
        selection: { anchor: range.from + insert.length },
        scrollIntoView: true,
      })
      return true
    }

    // 默认粘贴纯文本
    return false // 返回 false 让默认行为处理
  } catch {
    return false
  }
}

/**
 * 处理 DOM paste 事件中的图片粘贴
 * 当剪贴板中有图片文件时，保存到 assets 目录并插入 Markdown 图片引用
 * 此函数作为 smartPaste 的补充：在某些环境下 navigator.clipboard.read() 可能无法获取图片，
 * 但 DOM paste 事件的 clipboardData 可以直接获取
 *
 * @returns true 表示已处理图片粘贴，false 表示未找到图片
 */
export async function handlePasteImage(
  event: ClipboardEvent,
  view: EditorView,
): Promise<boolean> {
  const items = event.clipboardData?.items
  if (!items) return false

  for (const item of Array.from(items)) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (!file) continue

      event.preventDefault() // 阻止默认粘贴行为

      const relativePath = await saveClipboardImage(file)
      if (relativePath) {
        const { state } = view
        const range = state.selection.main
        const selectedText = state.sliceDoc(range.from, range.to)
        const insert = `![${selectedText || '图片'}](${relativePath})`
        view.dispatch({
          changes: { from: range.from, to: range.to, insert },
          selection: { anchor: range.from + insert.length },
          scrollIntoView: true,
        })
        return true
      }
    }
  }
  return false
}
