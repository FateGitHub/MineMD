import {
  EditorView,
  Decoration,
  DecorationSet,
  WidgetType,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view'
import { StateField, StateEffect, type Range } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import { markdownToHtmlSync } from '../markdown/parser'

/**
 * 模块级状态：当前文件所在目录（用于解析相对路径的图片）
 */
let currentFileDir: string | null = null

/**
 * 设置当前文件目录，供 WYSIWYG 渲染时解析相对路径的本地图片
 */
export function setWysiwygFileDir(dir: string | null) {
  currentFileDir = dir
}

/**
 * 图片缓存：absolutePath -> data URL
 * 与 Preview 组件共享同一缓存，避免重复加载
 */
const wysiwygImageCache = new Map<string, string>()

/**
 * 处理 HTML 中的本地图片：
 * 同步将已缓存的相对路径图片替换为 data URL，
 * 未缓存的替换为透明占位图并记录待加载路径。
 */
function processLocalImages(
  html: string,
  fileDir: string | null,
): { html: string; pendingImages: Array<{ absolutePath: string }> } {
  if (!fileDir) return { html, pendingImages: [] }

  const pendingImages: Array<{ absolutePath: string }> = []

  const processed = html.replace(
    /<img(\s+[^>]*?)src="(?!https?:\/\/|data:)([^"]+)"([^>]*?)>/g,
    (_match, before, src, after) => {
      const absolutePath = `${fileDir}/${src}`.replace(/\\/g, '/')

      // 检查缓存
      const cached = wysiwygImageCache.get(absolutePath)
      if (cached) {
        return `<img${before}src="${cached}"${after}>`
      }

      // 未缓存：使用占位图，标记 data-local-src 用于异步加载后替换
      pendingImages.push({ absolutePath })
      return `<img${before}src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" data-local-src="${absolutePath}"${after}>`
    },
  )

  return { html: processed, pendingImages }
}

/**
 * 异步加载本地图片并更新 DOM 元素中的占位图
 */
async function loadAndReplaceImages(
  wrapper: HTMLElement,
  pendingImages: Array<{ absolutePath: string }>,
) {
  if (pendingImages.length === 0) return

  // 去重
  const uniquePaths = [...new Set(pendingImages.map(p => p.absolutePath))]

  const loadTasks = uniquePaths.map(async (absolutePath) => {
    if (wysiwygImageCache.has(absolutePath)) return
    try {
      const dataUrl = await window.electronAPI.readImage(absolutePath)
      if (dataUrl) {
        wysiwygImageCache.set(absolutePath, dataUrl)
      }
    } catch (err) {
      console.warn('[WYSIWYG] 加载本地图片失败:', absolutePath, err)
    }
  })

  await Promise.all(loadTasks)

  // 加载完成后，更新 DOM 中所有占位图
  const placeholders = wrapper.querySelectorAll<HTMLImageElement>('img[data-local-src]')
  placeholders.forEach((img) => {
    const localSrc = img.getAttribute('data-local-src')
    if (localSrc) {
      const cached = wysiwygImageCache.get(localSrc)
      if (cached) {
        img.src = cached
        img.removeAttribute('data-local-src')
      }
    }
  })
}

/**
 * Markdown 块的信息
 */
interface MarkdownBlock {
  /** 块在文档中的起始位置 */
  from: number
  /** 块在文档中的结束位置 */
  to: number
  /** 块的 Markdown 源码 */
  text: string
  /** 块类型 */
  type: string
}

/**
 * 渲染后的 Markdown HTML Widget
 * 将 Markdown 块渲染为 HTML 并显示在编辑器中
 */
class RenderedBlockWidget extends WidgetType {
  private html: string
  private pendingImages: Array<{ absolutePath: string }>
  private isDark: boolean

  constructor(
    readonly markdownText: string,
    readonly blockType: string,
    isDark: boolean,
  ) {
    super()
    this.isDark = isDark
    this.pendingImages = []
    // 渲染 Markdown 为 HTML（安全保护）
    try {
      const rawHtml = markdownToHtmlSync(markdownText)
      // 处理本地图片路径
      const result = processLocalImages(rawHtml, currentFileDir)
      this.html = result.html
      this.pendingImages = result.pendingImages
    } catch {
      // 渲染失败时显示纯文本
      this.html = `<p>${escapeHtml(markdownText)}</p>`
    }
  }

  eq(other: RenderedBlockWidget): boolean {
    return this.markdownText === other.markdownText && this.isDark === other.isDark
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement('div')
    wrapper.className = 'wysiwyg-rendered-block markdown-body'
    wrapper.innerHTML = this.html

    // 如果有未缓存的本地图片，异步加载并更新 DOM
    if (this.pendingImages.length > 0) {
      loadAndReplaceImages(wrapper, this.pendingImages)
    }

    return wrapper
  }

  ignoreEvent(): boolean {
    // 返回 false 让 CodeMirror 处理事件（点击 Widget 时定位光标）
    return false
  }
}

/**
 * 简单 HTML 转义
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * 解析文档，识别所有 Markdown 块
 * 利用 CodeMirror 的语法树来精确识别块边界
 */
function parseMarkdownBlocks(view: EditorView): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  const doc = view.state.doc

  // 安全获取语法树（可能尚未解析完成）
  let tree
  try {
    tree = syntaxTree(view.state)
  } catch {
    return blocks
  }

  // 如果语法树为空或文档为空，直接返回
  if (!tree || doc.length === 0) return blocks

  // 追踪已处理的行范围，避免重复
  const processedRanges = new Set<string>()

  try {
    tree.iterate({
      enter(node) {
        // 只处理顶层块级节点
        const blockTypes = [
          'ATXHeading1', 'ATXHeading2', 'ATXHeading3',
          'ATXHeading4', 'ATXHeading5', 'ATXHeading6',
          'Paragraph',
          'FencedCode',
          'Blockquote',
          'BulletList', 'OrderedList',
          'HorizontalRule',
          'Table',
          'HTMLBlock',
        ]

        if (!blockTypes.includes(node.name)) return

        // 安全边界检查
        if (node.from < 0 || node.to > doc.length || node.from >= node.to) return

        // 获取块的行范围
        const fromLine = doc.lineAt(node.from)
        const toLine = doc.lineAt(node.to)

        // 扩展到完整行
        const from = fromLine.from
        const to = toLine.to

        const rangeKey = `${from}-${to}`
        if (processedRanges.has(rangeKey)) return
        processedRanges.add(rangeKey)

        const text = doc.sliceString(from, to)

        blocks.push({
          from,
          to,
          text,
          type: node.name,
        })
      },
    })
  } catch {
    // 语法树遍历失败，返回空数组
    return []
  }

  // 按位置排序
  blocks.sort((a, b) => a.from - b.from)

  // 去重：如果有重叠块，保留较大的那个
  const merged: MarkdownBlock[] = []
  for (const block of blocks) {
    if (merged.length === 0) {
      merged.push(block)
      continue
    }
    const last = merged[merged.length - 1]
    if (block.from >= last.from && block.to <= last.to) {
      // block 完全在 last 内部，跳过
      continue
    }
    if (block.from < last.to) {
      // 有重叠，合并
      last.to = Math.max(last.to, block.to)
      last.text = doc.sliceString(last.from, last.to)
      continue
    }
    merged.push(block)
  }

  return merged
}

/**
 * 判断光标是否在指定块内
 */
function isCursorInBlock(view: EditorView, block: MarkdownBlock): boolean {
  const { state } = view
  const selection = state.selection

  for (const range of selection.ranges) {
    const cursorPos = range.head
    // 光标在块范围内
    if (cursorPos >= block.from && cursorPos <= block.to) {
      return true
    }
  }
  return false
}

/**
 * 构建 Decoration，将非活跃块替换为渲染后的 HTML Widget
 * 包含全面的错误保护
 */
function buildDecorations(view: EditorView): DecorationSet {
  try {
    const blocks = parseMarkdownBlocks(view)
    if (blocks.length === 0) return Decoration.none

    const decorations: Range<Decoration>[] = []
    const isDark = document.documentElement.classList.contains('dark')

    for (const block of blocks) {
      // 跳过光标所在的块 —— 保持源码编辑状态
      if (isCursorInBlock(view, block)) continue

      // 跳过空行
      if (block.text.trim() === '' || block.text.trim() === '&nbsp;') continue

      // 安全边界检查
      if (block.from < 0 || block.to > view.state.doc.length || block.from >= block.to) continue

      try {
        // 创建 Widget Decoration 替换整个块
        const widget = new RenderedBlockWidget(block.text, block.type, isDark)
        const deco = Decoration.replace({
          widget,
          block: true,
        })

        decorations.push(deco.range(block.from, block.to))
      } catch {
        // 单个块渲染失败，跳过该块
        continue
      }
    }

    return Decoration.set(decorations, true)
  } catch {
    // 整个构建过程失败，返回空 Decoration
    return Decoration.none
  }
}

/**
 * StateEffect：用于从 ViewPlugin 向 StateField 传递新的装饰集
 */
const updateWysiwygDecorations = StateEffect.define<DecorationSet>()

/**
 * WYSIWYG 块级渲染 StateField
 * 
 * 注意：CodeMirror 6 要求块级装饰（block: true）必须通过 StateField 提供，
 * 不能通过 ViewPlugin 提供，否则会抛出 "Block decorations may not be specified via plugins" 错误。
 * 
 * 核心逻辑：
 * 1. 解析文档，识别所有 Markdown 块
 * 2. 将不含光标的块替换为渲染后的 HTML Widget
 * 3. 光标所在块保持 Markdown 源码可编辑
 * 4. 光标移动时动态更新：旧块渲染，新块解除渲染
 */
const wysiwygBlockField = StateField.define<DecorationSet>({
  create() {
    // StateField.create 没有 EditorView，无法构建装饰
    // 返回空的 DecorationSet，等 ViewPlugin 初始化后通过 effect 更新
    return Decoration.none
  },
  update(decorations, tr) {
    // 检查是否有 effect 携带新的装饰集
    for (const effect of tr.effects) {
      if (effect.is(updateWysiwygDecorations)) {
        return effect.value
      }
    }
    // 文档变更时映射现有装饰（保持位置同步）
    if (tr.docChanged) {
      return decorations.map(tr.changes)
    }
    return decorations
  },
  provide(field) {
    return EditorView.decorations.from(field)
  },
})

/**
 * ViewPlugin：负责监听视图变化并通过 StateEffect 更新 StateField 中的装饰
 * 
 * 这个 ViewPlugin 本身不提供任何装饰（没有 decorations 属性），
 * 它只是作为一个"桥梁"，在能访问 EditorView 时构建装饰，
 * 然后通过 dispatch effect 传递给 StateField。
 */
const wysiwygBlockUpdater = ViewPlugin.fromClass(
  class {
    constructor(view: EditorView) {
      // 初始化时构建装饰并通过 effect 传递给 StateField
      this.scheduleUpdate(view)
    }

    update(update: ViewUpdate) {
      // 文档变更、选区变更、视口变更时重新构建装饰
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.scheduleUpdate(update.view)
      }
    }

    private scheduleUpdate(view: EditorView) {
      // 使用 requestAnimationFrame 确保在当前渲染周期之后执行，
      // 避免在 EditorView 构造函数中 dispatch
      requestAnimationFrame(() => {
        // 确保 view 没有被销毁
        if (!view.dom.parentNode) return
        try {
          const newDecorations = buildDecorations(view)
          view.dispatch({
            effects: updateWysiwygDecorations.of(newDecorations),
          })
        } catch {
          // 构建失败，忽略
        }
      })
    }
  },
)

/**
 * WYSIWYG 模式的额外编辑器样式
 * 注意：大部分渲染块样式在 index.css 中定义，这里只放 CodeMirror 特有的覆盖
 */
export const wysiwygStyles = EditorView.theme({
  // 隐藏行号，提供沉浸式写作体验
  '.cm-gutters': {
    display: 'none !important',
  },
})

/**
 * 获取完整的 WYSIWYG 块级渲染扩展
 */
export function getWysiwygBlockExtension() {
  return [wysiwygBlockField, wysiwygBlockUpdater, wysiwygStyles]
}
