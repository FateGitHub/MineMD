import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'

/**
 * Markdown 格式化命令集合
 * 提供对 CodeMirror EditorView 的各种 Markdown 格式化操作
 */

// ========== 行内格式化 ==========

/**
 * 通用行内包裹函数
 * 选中文本前后添加标记（如 ** ** / * * / ~~ ~~ 等）
 */
function wrapInline(view: EditorView, marker: string): boolean {
  const { state } = view
  const changes = state.changeByRange((range) => {
    const text = state.sliceDoc(range.from, range.to)

    // 检查是否已有该标记 → 移除标记
    const beforeStart = Math.max(0, range.from - marker.length)
    const afterEnd = Math.min(state.doc.length, range.to + marker.length)
    const before = state.sliceDoc(beforeStart, range.from)
    const after = state.sliceDoc(range.to, afterEnd)

    if (before === marker && after === marker) {
      // 已包裹，移除标记
      return {
        changes: [
          { from: beforeStart, to: range.from, insert: '' },
          { from: range.to, to: afterEnd, insert: '' },
        ],
        range: EditorSelection.range(
          range.from - marker.length,
          range.to - marker.length,
        ),
      }
    }

    // 添加标记
    const insert = `${marker}${text || '文本'}${marker}`
    return {
      changes: { from: range.from, to: range.to, insert },
      range: EditorSelection.range(
        range.from + marker.length,
        range.from + marker.length + (text || '文本').length,
      ),
    }
  })

  view.dispatch(changes, { scrollIntoView: true })
  view.focus()
  return true
}

/** 加粗 */
export function toggleBold(view: EditorView): boolean {
  return wrapInline(view, '**')
}

/** 斜体 */
export function toggleItalic(view: EditorView): boolean {
  return wrapInline(view, '*')
}

/** 删除线 */
export function toggleStrikethrough(view: EditorView): boolean {
  return wrapInline(view, '~~')
}

/** 下划线（HTML 标签） */
export function toggleUnderline(view: EditorView): boolean {
  const { state } = view
  const changes = state.changeByRange((range) => {
    const text = state.sliceDoc(range.from, range.to)
    const before = state.sliceDoc(Math.max(0, range.from - 3), range.from)
    const after = state.sliceDoc(range.to, Math.min(state.doc.length, range.to + 4))

    if (before === '<u>' && after === '</u>') {
      return {
        changes: [
          { from: range.from - 3, to: range.from, insert: '' },
          { from: range.to, to: range.to + 4, insert: '' },
        ],
        range: EditorSelection.range(range.from - 3, range.to - 3),
      }
    }

    const insert = `<u>${text || '文本'}</u>`
    return {
      changes: { from: range.from, to: range.to, insert },
      range: EditorSelection.range(
        range.from + 3,
        range.from + 3 + (text || '文本').length,
      ),
    }
  })

  view.dispatch(changes, { scrollIntoView: true })
  view.focus()
  return true
}

/** 行内代码 */
export function toggleInlineCode(view: EditorView): boolean {
  return wrapInline(view, '`')
}

/** 行内公式 */
export function toggleInlineMath(view: EditorView): boolean {
  return wrapInline(view, '$')
}

/** 高亮文本 */
export function toggleHighlight(view: EditorView): boolean {
  return wrapInline(view, '==')
}

// ========== 块级格式化 ==========

/** 设置标题级别 (1-6)，如果已经是该级别则取消 */
export function setHeading(view: EditorView, level: number): boolean {
  const { state } = view
  const pos = state.selection.main.head
  const line = state.doc.lineAt(pos)
  const prefix = '#'.repeat(level) + ' '
  const headingMatch = line.text.match(/^(#{1,6})\s/)

  let insert: string
  let newCursorPos: number

  if (headingMatch && headingMatch[1].length === level) {
    // 已经是该级别，取消标题
    insert = line.text.replace(/^#{1,6}\s/, '')
    newCursorPos = line.from + Math.max(0, pos - line.from - headingMatch[0].length)
  } else if (headingMatch) {
    // 已有其他级别标题，替换
    insert = line.text.replace(/^#{1,6}\s/, prefix)
    newCursorPos = line.from + prefix.length + Math.max(0, pos - line.from - headingMatch[0].length)
  } else {
    // 无标题，添加
    insert = prefix + line.text
    newCursorPos = pos + prefix.length
  }

  view.dispatch({
    changes: { from: line.from, to: line.to, insert },
    selection: { anchor: newCursorPos },
    scrollIntoView: true,
  })
  view.focus()
  return true
}

/** 插入代码块 */
export function insertCodeBlock(view: EditorView): boolean {
  const { state } = view
  const range = state.selection.main
  const text = state.sliceDoc(range.from, range.to)

  const insert = text
    ? `\`\`\`\n${text}\n\`\`\``
    : '```\n\n```'

  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: { anchor: range.from + (text ? 3 : 4) },
    scrollIntoView: true,
  })
  view.focus()
  return true
}

/** 插入数学公式块 */
export function insertMathBlock(view: EditorView): boolean {
  const { state } = view
  const range = state.selection.main
  const text = state.sliceDoc(range.from, range.to)

  const insert = text
    ? `$$\n${text}\n$$`
    : '$$\n\n$$'

  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: { anchor: range.from + 3 },
    scrollIntoView: true,
  })
  view.focus()
  return true
}

/** 切换引用 */
export function toggleBlockquote(view: EditorView): boolean {
  const { state } = view
  const pos = state.selection.main.head
  const line = state.doc.lineAt(pos)

  if (line.text.startsWith('> ')) {
    // 移除引用
    view.dispatch({
      changes: { from: line.from, to: line.from + 2, insert: '' },
      selection: { anchor: Math.max(line.from, pos - 2) },
      scrollIntoView: true,
    })
  } else {
    // 添加引用
    view.dispatch({
      changes: { from: line.from, insert: '> ' },
      selection: { anchor: pos + 2 },
      scrollIntoView: true,
    })
  }
  view.focus()
  return true
}

/** 切换无序列表 */
export function toggleUnorderedList(view: EditorView): boolean {
  const { state } = view
  const pos = state.selection.main.head
  const line = state.doc.lineAt(pos)

  const match = line.text.match(/^(\s*)[-*+]\s/)
  if (match) {
    view.dispatch({
      changes: { from: line.from, to: line.from + match[0].length, insert: match[1] },
      selection: { anchor: Math.max(line.from, pos - (match[0].length - match[1].length)) },
      scrollIntoView: true,
    })
  } else {
    const indent = line.text.match(/^(\s*)/)?.[1] || ''
    view.dispatch({
      changes: { from: line.from + indent.length, insert: '- ' },
      selection: { anchor: pos + 2 },
      scrollIntoView: true,
    })
  }
  view.focus()
  return true
}

/** 切换有序列表 */
export function toggleOrderedList(view: EditorView): boolean {
  const { state } = view
  const pos = state.selection.main.head
  const line = state.doc.lineAt(pos)

  const match = line.text.match(/^(\s*)\d+\.\s/)
  if (match) {
    view.dispatch({
      changes: { from: line.from, to: line.from + match[0].length, insert: match[1] },
      selection: { anchor: Math.max(line.from, pos - (match[0].length - match[1].length)) },
      scrollIntoView: true,
    })
  } else {
    const indent = line.text.match(/^(\s*)/)?.[1] || ''
    view.dispatch({
      changes: { from: line.from + indent.length, insert: '1. ' },
      selection: { anchor: pos + 3 },
      scrollIntoView: true,
    })
  }
  view.focus()
  return true
}

/** 切换任务列表 */
export function toggleTaskList(view: EditorView): boolean {
  const { state } = view
  const pos = state.selection.main.head
  const line = state.doc.lineAt(pos)

  const match = line.text.match(/^(\s*)[-*+]\s\[[ x]\]\s/)
  if (match) {
    // 移除任务列表标记
    view.dispatch({
      changes: { from: line.from, to: line.from + match[0].length, insert: match[1] },
      selection: { anchor: Math.max(line.from, pos - (match[0].length - match[1].length)) },
      scrollIntoView: true,
    })
  } else {
    const indent = line.text.match(/^(\s*)/)?.[1] || ''
    // 如果已是普通列表项，转换为任务列表
    const listMatch = line.text.match(/^(\s*)[-*+]\s/)
    if (listMatch) {
      view.dispatch({
        changes: { from: line.from + listMatch[0].length, insert: '[ ] ' },
        selection: { anchor: pos + 4 },
        scrollIntoView: true,
      })
    } else {
      view.dispatch({
        changes: { from: line.from + indent.length, insert: '- [ ] ' },
        selection: { anchor: pos + 6 },
        scrollIntoView: true,
      })
    }
  }
  view.focus()
  return true
}

/** 插入表格 */
export function insertTable(view: EditorView): boolean {
  const { state } = view
  const pos = state.selection.main.head

  const table = `| 列1 | 列2 | 列3 |
| --- | --- | --- |
|     |     |     |`

  view.dispatch({
    changes: { from: pos, insert: '\n' + table + '\n' },
    selection: { anchor: pos + 3 },
    scrollIntoView: true,
  })
  view.focus()
  return true
}

/** 插入水平线 */
export function insertHorizontalRule(view: EditorView): boolean {
  const { state } = view
  const pos = state.selection.main.head
  const line = state.doc.lineAt(pos)

  const insert = line.text.length > 0
    ? '\n\n---\n\n'
    : '---\n\n'

  view.dispatch({
    changes: { from: line.to, insert },
    selection: { anchor: line.to + insert.length },
    scrollIntoView: true,
  })
  view.focus()
  return true
}

/** 插入链接 */
export function insertLink(view: EditorView): boolean {
  const { state } = view
  const range = state.selection.main
  const text = state.sliceDoc(range.from, range.to)

  const insert = text
    ? `[${text}](url)`
    : '[链接文本](url)'

  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: {
      anchor: range.from + (text ? text.length + 3 : 7),
      head: range.from + (text ? text.length + 6 : 10),
    },
    scrollIntoView: true,
  })
  view.focus()
  return true
}

/** 插入图片 */
export function insertImage(view: EditorView): boolean {
  const { state } = view
  const range = state.selection.main
  const text = state.sliceDoc(range.from, range.to)

  const insert = text
    ? `![${text}](url)`
    : '![图片描述](url)'

  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: {
      anchor: range.from + (text ? text.length + 4 : 8),
      head: range.from + (text ? text.length + 7 : 11),
    },
    scrollIntoView: true,
  })
  view.focus()
  return true
}

/** 格式化文档（美化 Markdown：统一空行、修剪尾部空白） */
export function formatDocument(view: EditorView): boolean {
  const content = view.state.doc.toString()
  let formatted = content
    // 移除行尾多余空白
    .replace(/[ \t]+$/gm, '')
    // 标题前保证空行
    .replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2')
    // 连续多个空行合并为两个
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n'

  if (formatted === content) return true

  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: formatted },
    scrollIntoView: true,
  })
  view.focus()
  return true
}

/** 清空编辑器内容 */
export function clearContent(view: EditorView): boolean {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: '' },
    selection: { anchor: 0 },
    scrollIntoView: true,
  })
  view.focus()
  return true
}

/**
 * 跳转到指定行（用于大纲点击）
 */
export function gotoLine(view: EditorView, lineNumber: number): void {
  const lineNum = Math.min(lineNumber + 1, view.state.doc.lines)
  const line = view.state.doc.line(lineNum)
  view.dispatch({
    selection: { anchor: line.from },
    effects: EditorView.scrollIntoView(line.from, { y: 'start', yMargin: 60 }),
  })
  view.focus()
}
