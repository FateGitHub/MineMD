import { useMemo, useCallback } from 'react'
import { useFileStore } from '../../stores/fileStore'
import { getGlobalEditorView } from '../../editor/editorViewRef'
import { gotoLine } from '../../editor/commands/markdownCommands'

interface TocItem {
  level: number
  text: string
  line: number
}

/**
 * 大纲组件 —— Typora 风格
 * 根据标题生成可点击的大纲导航，点击后跳转到对应位置
 */
function Outline() {
  const { currentFile } = useFileStore()

  const tocItems = useMemo(() => {
    return parseToc(currentFile.content)
  }, [currentFile.content])

  // 点击大纲项跳转
  const handleClick = useCallback((item: TocItem) => {
    const view = getGlobalEditorView()
    if (view) {
      gotoLine(view, item.line)
    }
  }, [])

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
