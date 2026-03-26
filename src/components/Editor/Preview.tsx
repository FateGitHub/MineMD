import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useFileStore } from '../../stores/fileStore'
import { useEditorStore } from '../../stores/editorStore'
import { markdownToHtmlSync } from '../../editor/markdown/parser'
import { getGlobalEditorView } from '../../editor/editorViewRef'

/** Mermaid 模块缓存（避免每次渲染都重新动态 import） */
let mermaidModule: typeof import('mermaid').default | null = null

/**
 * 获取当前文件所在目录（用于将相对路径转为绝对路径）
 */
function getCurrentFileDir(filePath: string | null): string | null {
  if (!filePath) return null
  const normalized = filePath.replace(/\\/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  return lastSlash >= 0 ? normalized.substring(0, lastSlash) : null
}

/**
 * 图片缓存：absolutePath -> data URL
 * 避免每次渲染都重复读取文件
 *
 * 使用 LRU 策略限制最大缓存数量，防止长时间使用导致内存泄漏。
 * data URL 中每张图片可能占用数百 KB 到数 MB 内存，不做限制会持续增长。
 */
const IMAGE_CACHE_MAX = 200
const imageCache = new Map<string, string>()

/**
 * 向图片缓存写入，超过上限时淘汰最旧的条目（Map 保持插入顺序）
 */
function imageCacheSet(key: string, value: string) {
  // 如果 key 已存在，先删再插以刷新顺序（模拟 LRU）
  if (imageCache.has(key)) {
    imageCache.delete(key)
  }
  imageCache.set(key, value)
  // 超出上限时移除最早插入的条目
  if (imageCache.size > IMAGE_CACHE_MAX) {
    const firstKey = imageCache.keys().next().value
    if (firstKey !== undefined) {
      imageCache.delete(firstKey)
    }
  }
}

/**
 * 处理 HTML 中的本地图片：
 * 将相对路径的 <img src="..."> 替换为缓存的 data URL 或透明占位图，
 * 同时收集需要异步加载的图片路径列表。
 */
function preprocessLocalImages(
  html: string,
  fileDir: string | null,
): { html: string; pendingPaths: string[] } {
  if (!fileDir) return { html, pendingPaths: [] }

  const pendingPaths: string[] = []

  // 匹配 <img src="...">，排除已有协议的 URL（http/https/data:）
  const processed = html.replace(
    /<img(\s+[^>]*?)src="(?!https?:\/\/|data:)([^"]+)"([^>]*?)>/g,
    (_match, before, src, after) => {
      const absolutePath = `${fileDir}/${src}`.replace(/\\/g, '/')

      // 检查缓存：如果已有 data URL，直接使用
      const cached = imageCache.get(absolutePath)
      if (cached) {
        return `<img${before}src="${cached}"${after}>`
      }

      // 未缓存：记录待加载路径，使用透明占位图阻止浏览器加载相对路径
      pendingPaths.push(absolutePath)
      return `<img${before}src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" data-local-src="${absolutePath}"${after}>`
    },
  )

  return { html: processed, pendingPaths }
}

/**
 * 异步加载未缓存的本地图片，将结果写入缓存。
 * 返回成功加载的图片数量（用于触发 React 重新渲染）。
 */
async function loadPendingImages(
  pendingPaths: string[],
  signal: AbortSignal,
): Promise<number> {
  if (pendingPaths.length === 0) return 0

  // 去重
  const uniquePaths = [...new Set(pendingPaths)]
  let loadedCount = 0

  const tasks = uniquePaths.map(async (absolutePath) => {
    // 再次检查缓存（可能并发加载时已由其他请求完成）
    if (imageCache.has(absolutePath)) return
    try {
      const dataUrl = await window.electronAPI.readImage(absolutePath)
      if (signal.aborted) return
      if (dataUrl) {
        imageCacheSet(absolutePath, dataUrl)
        loadedCount++
      }
    } catch (err) {
      console.warn('加载本地图片失败:', absolutePath, err)
    }
  })

  await Promise.all(tasks)
  return loadedCount
}

/**
 * Markdown 预览组件 —— Typora 风格
 * 将 Markdown 内容渲染为 HTML 并展示
 * 在实时预览模式下支持与编辑器的滚动同步
 *
 * 图片加载策略：
 * 1. preprocessLocalImages：同步替换已缓存的图片为 data URL，未缓存的用占位图
 * 2. loadPendingImages：异步加载未缓存的图片并写入缓存
 * 3. 加载完成后通过 imageCacheVersion 状态触发 React 重新渲染
 * 4. 重新渲染时 preprocessLocalImages 从缓存中读取已加载的图片 → 图片正常显示
 *
 * 这种方式完全由 React 状态驱动，避免直接 DOM 操作被 React 重新渲染覆盖的竞态问题。
 */
function Preview() {
  const { currentFile } = useFileStore()
  const { viewMode } = useEditorStore()
  const previewRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const isSyncingScroll = useRef(false)
  // 图片缓存版本号：每次有新图片加载完成时递增，触发 useMemo 重新计算 HTML
  const [imageCacheVersion, setImageCacheVersion] = useState(0)

  // 获取当前文件目录
  const fileDir = getCurrentFileDir(currentFile.filePath)

  // 将 Markdown 转为 HTML，并预处理本地图片路径
  // 依赖 imageCacheVersion：图片加载完成后重新计算，此时 preprocessLocalImages 能从缓存中命中
  const { html, pendingPaths } = useMemo(() => {
    try {
      const rawHtml = markdownToHtmlSync(currentFile.content)
      return preprocessLocalImages(rawHtml, fileDir)
    } catch {
      return { html: '<p style="color:red;">Markdown 解析错误</p>', pendingPaths: [] as string[] }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFile.content, fileDir, imageCacheVersion])

  // 异步加载未缓存的图片，完成后递增 imageCacheVersion 触发重新渲染
  useEffect(() => {
    if (pendingPaths.length === 0) return

    const abortController = new AbortController()

    loadPendingImages(pendingPaths, abortController.signal).then((loadedCount) => {
      if (!abortController.signal.aborted && loadedCount > 0) {
        // 有新图片加载完成，递增版本号触发 React 重新渲染
        setImageCacheVersion((v) => v + 1)
      }
    })

    return () => {
      abortController.abort()
    }
  }, [pendingPaths])

  /**
   * 获取编辑器实际的滚动容器。
   * 由于 CSS 中 .cm-scroller 设置了 overflow: visible，
   * CodeMirror 的 scrollDOM 不是实际的滚动容器——
   * 实际滚动发生在外层的 .editor-wrapper 元素上。
   * 需要从 editorView.dom 向上查找该滚动容器。
   */
  const getEditorScrollContainer = useCallback((): HTMLElement | null => {
    const editorView = getGlobalEditorView()
    if (!editorView) return null

    // 从 editorView.dom (.cm-editor) 向上查找 .editor-wrapper
    let el: HTMLElement | null = editorView.dom
    while (el) {
      if (el.classList.contains('editor-wrapper')) {
        return el
      }
      el = el.parentElement
    }
    return null
  }, [])

  // 滚动同步：基于源码行号映射，编辑器滚动时同步预览面板
  const syncScrollFromEditor = useCallback(() => {
    if (viewMode !== 'live' || isSyncingScroll.current) return

    const editorView = getGlobalEditorView()
    if (!editorView || !wrapperRef.current || !previewRef.current) return

    const editorScrollContainer = getEditorScrollContainer()
    if (!editorScrollContainer) return

    const { scrollTop, scrollHeight, clientHeight } = editorScrollContainer

    // 边界情况：编辑器滚到底部时，预览也滚到底部
    if (scrollTop + clientHeight >= scrollHeight - 1) {
      isSyncingScroll.current = true
      wrapperRef.current.scrollTop = wrapperRef.current.scrollHeight
      requestAnimationFrame(() => { isSyncingScroll.current = false })
      return
    }

    // 边界情况：编辑器在顶部时，预览也在顶部
    if (scrollTop <= 0) {
      isSyncingScroll.current = true
      wrapperRef.current.scrollTop = 0
      requestAnimationFrame(() => { isSyncingScroll.current = false })
      return
    }

    // 获取编辑器视口顶部对应的文档行号（1-based）
    // 使用编辑器滚动容器的顶部坐标作为参考点
    const containerRect = editorScrollContainer.getBoundingClientRect()
    const topPos = editorView.posAtCoords({ x: containerRect.left + 10, y: containerRect.top })
    if (topPos === null) return
    const topLine = editorView.state.doc.lineAt(topPos).number

    // 计算编辑器当前行在视口中的偏移比例（用于亚行级精度）
    const lineBlock = editorView.lineBlockAt(topPos)
    const coords = editorView.coordsAtPos(lineBlock.from)
    const lineOffsetRatio = (lineBlock.height > 0 && coords)
      ? (containerRect.top - coords.top) / lineBlock.height
      : 0

    // 在预览中查找带有 data-source-line 属性的所有元素
    const lineElements = previewRef.current.querySelectorAll<HTMLElement>('[data-source-line]')
    if (lineElements.length === 0) {
      // 没有行号标记，回退到百分比同步
      const scrollRatio = scrollHeight <= clientHeight ? 0 : scrollTop / (scrollHeight - clientHeight)
      isSyncingScroll.current = true
      wrapperRef.current.scrollTop = scrollRatio * (wrapperRef.current.scrollHeight - wrapperRef.current.clientHeight)
      requestAnimationFrame(() => { isSyncingScroll.current = false })
      return
    }

    // 转换为数组并按行号排序
    const elements = Array.from(lineElements).map(el => ({
      el,
      line: parseInt(el.getAttribute('data-source-line')!, 10)
    })).sort((a, b) => a.line - b.line)

    // 二分查找：找到 ≤ topLine 的最大行号对应的元素
    let lo = 0, hi = elements.length - 1
    let matchIdx = 0
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1
      if (elements[mid].line <= topLine) {
        matchIdx = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }

    const current = elements[matchIdx]
    const next = matchIdx + 1 < elements.length ? elements[matchIdx + 1] : null

    // 计算预览中目标滚动位置
    const wrapperRect = wrapperRef.current.getBoundingClientRect()
    const currentTop = current.el.getBoundingClientRect().top - wrapperRect.top + wrapperRef.current.scrollTop

    let targetScroll: number
    if (next) {
      // 在当前元素和下一个元素之间做线性插值
      const nextTop = next.el.getBoundingClientRect().top - wrapperRect.top + wrapperRef.current.scrollTop
      const lineDiff = next.line - current.line
      const linesFromCurrent = topLine - current.line + lineOffsetRatio
      const ratio = lineDiff > 0 ? Math.min(linesFromCurrent / lineDiff, 1) : 0
      targetScroll = currentTop + ratio * (nextTop - currentTop)
    } else {
      // 没有下一个元素，直接对齐到当前元素
      targetScroll = currentTop
    }

    isSyncingScroll.current = true
    wrapperRef.current.scrollTop = targetScroll
    requestAnimationFrame(() => { isSyncingScroll.current = false })
  }, [viewMode, getEditorScrollContainer])

  // 监听编辑器滚动事件（实时预览模式）
  useEffect(() => {
    if (viewMode !== 'live') return

    let rafId = 0
    let cleanupFn: (() => void) | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    const setupListener = () => {
      // 获取编辑器实际的滚动容器（.editor-wrapper），而不是 cm-scroller
      // 因为 CSS 中 cm-scroller 的 overflow 设为 visible，不会触发 scroll 事件
      const editorScrollContainer = getEditorScrollContainer()
      if (!editorScrollContainer) {
        // 编辑器可能还未完全挂载，延迟重试
        retryTimer = setTimeout(setupListener, 100)
        return
      }

      // 使用 requestAnimationFrame 节流，避免高频滚动事件导致性能问题
      const handleScroll = () => {
        if (rafId) cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(syncScrollFromEditor)
      }

      editorScrollContainer.addEventListener('scroll', handleScroll, { passive: true })

      cleanupFn = () => {
        editorScrollContainer.removeEventListener('scroll', handleScroll)
      }
    }

    setupListener()

    return () => {
      if (retryTimer) clearTimeout(retryTimer)
      if (rafId) cancelAnimationFrame(rafId)
      cleanupFn?.()
    }
  }, [viewMode, syncScrollFromEditor, getEditorScrollContainer])

  // Mermaid 图表渲染
  useEffect(() => {
    if (!previewRef.current) return

    const mermaidBlocks = previewRef.current.querySelectorAll('pre > code.language-mermaid')
    if (mermaidBlocks.length === 0) return

    const renderMermaid = async () => {
      // 缓存 mermaid 模块，避免每次渲染都重新 import
      if (!mermaidModule) {
        const mod = await import('mermaid')
        mermaidModule = mod.default
      }

      mermaidModule.initialize({
        startOnLoad: false,
        theme: document.documentElement.className === 'dark' ? 'dark' : 'default',
        securityLevel: 'loose',
      })

      mermaidBlocks.forEach(async (block, index) => {
        const pre = block.parentElement
        if (!pre || !pre.parentNode) return

        const code = block.textContent || ''
        const id = `mermaid-${Date.now()}-${index}`

        try {
          const { svg } = await mermaidModule!.render(id, code)
          // 渲染完成后再次检查 DOM 是否仍然有效（可能已被 React 重新渲染替换）
          if (!pre.parentNode) return
          const container = document.createElement('div')
          container.className = 'mermaid-rendered'
          container.innerHTML = svg
          pre.replaceWith(container)
        } catch (err) {
          console.warn('Mermaid 渲染失败:', err)
        }
      })
    }

    renderMermaid()
  }, [html])

  // 处理预览中的链接点击（拦截锚点链接实现页内滚动）
  useEffect(() => {
    const container = previewRef.current
    if (!container) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href) return

      // 处理页内锚点链接（#xxx）
      if (href.startsWith('#')) {
        e.preventDefault()
        const id = decodeURIComponent(href.slice(1))
        // 查找目标元素：先用 id，再用 name 属性
        const targetEl = container.querySelector(`[id="${CSS.escape(id)}"]`)
          || container.querySelector(`[name="${CSS.escape(id)}"]`)
        if (targetEl && wrapperRef.current) {
          const wrapperRect = wrapperRef.current.getBoundingClientRect()
          const targetRect = targetEl.getBoundingClientRect()
          const scrollTop = wrapperRef.current.scrollTop + (targetRect.top - wrapperRect.top) - 20
          wrapperRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' })
        }
        return
      }

      // 外部链接：阻止默认导航行为（在 Electron 中不应直接导航）
      if (href.startsWith('http://') || href.startsWith('https://')) {
        e.preventDefault()
      }
    }

    container.addEventListener('click', handleClick)
    return () => container.removeEventListener('click', handleClick)
  }, [html])

  return (
    <div
      ref={wrapperRef}
      className={`editor-wrapper ${viewMode === 'live' ? 'live-preview' : ''}`}
    >
      <div className="editor-content-area">
        <div
          ref={previewRef}
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}

export default Preview
