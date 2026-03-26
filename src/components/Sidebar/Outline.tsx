import { useMemo, useCallback } from 'react'
import { useFileStore } from '../../stores/fileStore'
import { useEditorStore } from '../../stores/editorStore'
import { getGlobalEditorView } from '../../editor/editorViewRef'
import { gotoLine } from '../../editor/commands/markdownCommands'

interface TocItem {
  level: number
  text: string
  line: number
}

/**
 * 在预览面板中滚动到指定行号对应的标题元素
 * 通过 data-source-line 属性匹配，找到 ≤ 目标行号的最近标题元素
 */
function scrollPreviewToLine(line: number): boolean {
  // 查找预览面板的滚动容器（.editor-wrapper）
  const previewPane = document.querySelector('.preview-pane .editor-wrapper')
  if (!previewPane) return false

  // 查找预览面板中的 markdown-body 容器
  const markdownBody = previewPane.querySelector('.markdown-body')
  if (!markdownBody) return false

  // 原始行号是 0-based（parseToc 中 i 从 0 开始），data-source-line 是 1-based
  const targetSourceLine = line + 1

  // 在预览中查找所有带 data-source-line 的标题元素
  const headingElements = markdownBody.querySelectorAll<HTMLElement>(
    'h1[data-source-line], h2[data-source-line], h3[data-source-line], h4[data-source-line], h5[data-source-line], h6[data-source-line]'
  )
  if (headingElements.length === 0) return false

  // 找到 data-source-line ≤ targetSourceLine 的最近标题元素
  let targetEl: HTMLElement | null = null
  for (const el of headingElements) {
    const sourceLine = parseInt(el.getAttribute('data-source-line')!, 10)
    if (sourceLine <= targetSourceLine) {
      targetEl = el
    } else {
      break
    }
  }

  // 如果没有找到 ≤ 的，取第一个
  if (!targetEl && headingElements.length > 0) {
    targetEl = headingElements[0]
  }

  if (targetEl) {
    const wrapperRect = previewPane.getBoundingClientRect()
    const targetRect = targetEl.getBoundingClientRect()
    const scrollTop = previewPane.scrollTop + (targetRect.top - wrapperRect.top) - 20
    previewPane.scrollTo({ top: scrollTop, behavior: 'smooth' })
    return true
  }

  return false
}

/**
 * 大纲组件 —— Typora 风格
 * 根据标题生成可点击的大纲导航，点击后跳转到对应位置
 */
function Outline() {
  const { currentFile } = useFileStore()
  const viewMode = useEditorStore((s) => s.viewMode)

  const tocItems = useMemo(() => {
    return parseToc(currentFile.content)
  }, [currentFile.content])

  // 点击大纲项跳转
  const handleClick = useCallback((item: TocItem) => {
    // 预览模式下，直接滚动预览面板到对应标题
    if (viewMode === 'preview') {
      scrollPreviewToLine(item.line)
      return
    }

    // 其他模式下，通过 CodeMirror 跳转
    const view = getGlobalEditorView()
    if (view) {
      gotoLine(view, item.line)
    }
  }, [viewMode])

  if (tocItems.length === 0) {
    return (
      <div className="outline-empty">
        暂无标题
      </div>
    )
  }

  const minLevel = Math.min(...tocItems.map((item) => item.level))

  return (
    <div style={{ padding: '4px 0' }}>
      {tocItems.map((item, index) => (
        <div
          key={`${item.line}-${index}`}
          className="outline-item"
          style={{
            paddingLeft: 16 + (item.level - minLevel) * 16,
            fontSize: item.level <= 2 ? '13px' : '12px',
            fontWeight: item.level <= 2 ? 500 : 400,
          }}
          title={item.text}
          onClick={() => handleClick(item)}
        >
          {item.text}
        </div>
      ))}
    </div>
  )
}

/**
 * 从 Markdown 内容中解析标题列表
 * 兼容 CRLF（\r\n）和 LF（\n）两种行尾格式
 */
function parseToc(content: string): TocItem[] {
  const lines = content.split('\n')
  const items: TocItem[] = []

  let inCodeBlock = false
  for (let i = 0; i < lines.length; i++) {
    // 去除行尾的 \r（处理 CRLF 行尾）
    const line = lines[i].replace(/\r$/, '')

    // 跳过代码块内部的 # 标记
    if (line.trimStart().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue

    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      items.push({
        level: match[1].length,
        text: match[2].trim(),
        line: i,
      })
    }
  }

  return items
}

export default Outline
