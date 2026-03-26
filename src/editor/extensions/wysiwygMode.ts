/**
 * WYSIWYG 即时渲染模式
 *
 * 类似 Obsidian 的实时预览模式：
 * - 非活跃行的 Markdown 语法标记被隐藏，显示渲染后的样式
 * - 光标所在行（及包含光标的块）显示原始 Markdown 源码
 * - 不破坏 CodeMirror 6 的虚拟滚动机制
 *
 * V3 重写说明：
 * - 利用 lezer 语法树的**子节点**（HeaderMark、EmphasisMark、CodeMark 等）精确定位标记位置
 *   而非依赖正则表达式匹配行文本，避免偏移量计算错误
 * - 新增 Table 支持（通过 Widget 渲染完整 HTML 表格）
 * - 修复图片、链接的范围计算问题
 */

import { Compartment, type Extension, RangeSetBuilder } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'

/** WYSIWYG 模式的 Compartment，用于动态启用/禁用 */
export const wysiwygCompartment = new Compartment()

// ========== Widget 类 ==========

/** 水平线 Widget */
class HrWidget extends WidgetType {
  toDOM() {
    const hr = document.createElement('hr')
    hr.className = 'cm-wysiwyg-hr'
    return hr
  }
  ignoreEvent() { return false }
}

/** 复选框 Widget */
class CheckboxWidget extends WidgetType {
  constructor(private checked: boolean) { super() }
  toDOM() {
    const cb = document.createElement('input')
    cb.type = 'checkbox'
    cb.checked = this.checked
    cb.className = 'cm-wysiwyg-checkbox'
    cb.disabled = true
    return cb
  }
  ignoreEvent() { return false }
}

/** 列表圆点 Widget */
class BulletWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span')
    span.className = 'cm-wysiwyg-bullet'
    span.textContent = '•'
    return span
  }
  ignoreEvent() { return false }
}

/** 有序列表编号 Widget */
class OrderedNumberWidget extends WidgetType {
  constructor(private num: string) { super() }
  toDOM() {
    const span = document.createElement('span')
    span.className = 'cm-wysiwyg-ordered-num'
    span.textContent = `${this.num}.`
    return span
  }
  ignoreEvent() { return false }
}

/** 代码块语言标签 Widget */
class CodeLangWidget extends WidgetType {
  constructor(private lang: string) { super() }
  toDOM() {
    const span = document.createElement('span')
    span.className = 'cm-wysiwyg-code-lang'
    span.textContent = this.lang || 'code'
    return span
  }
  ignoreEvent() { return false }
}

/** 图片占位 Widget */
class ImagePlaceholderWidget extends WidgetType {
  constructor(private alt: string) { super() }
  toDOM() {
    const span = document.createElement('span')
    span.className = 'cm-wysiwyg-image-ref'
    span.textContent = this.alt || '图片'
    return span
  }
  ignoreEvent() { return false }
}

/** 表格 Widget —— 将 Markdown 表格渲染为真正的 HTML table */
class TableWidget extends WidgetType {
  constructor(private tableHtml: string) { super() }
  eq(other: TableWidget) { return this.tableHtml === other.tableHtml }
  toDOM() {
    const wrapper = document.createElement('div')
    wrapper.className = 'cm-wysiwyg-table-wrapper'
    wrapper.innerHTML = this.tableHtml
    return wrapper
  }
  ignoreEvent() { return false }
}

// ========== 装饰标记 ==========
const boldMark = Decoration.mark({ class: 'cm-wysiwyg-bold' })
const italicMark = Decoration.mark({ class: 'cm-wysiwyg-italic' })
const strikethroughMark = Decoration.mark({ class: 'cm-wysiwyg-strikethrough' })
const inlineCodeMark = Decoration.mark({ class: 'cm-wysiwyg-inline-code' })
const linkTextMark = Decoration.mark({ class: 'cm-wysiwyg-link' })
const imageMark = Decoration.mark({ class: 'cm-wysiwyg-image-ref' })

const headingLineMarks: Record<number, Decoration> = {
  1: Decoration.line({ class: 'cm-wysiwyg-heading-line cm-wysiwyg-h1-line' }),
  2: Decoration.line({ class: 'cm-wysiwyg-heading-line cm-wysiwyg-h2-line' }),
  3: Decoration.line({ class: 'cm-wysiwyg-heading-line cm-wysiwyg-h3-line' }),
  4: Decoration.line({ class: 'cm-wysiwyg-heading-line cm-wysiwyg-h4-line' }),
  5: Decoration.line({ class: 'cm-wysiwyg-heading-line cm-wysiwyg-h5-line' }),
  6: Decoration.line({ class: 'cm-wysiwyg-heading-line cm-wysiwyg-h6-line' }),
}

const blockquoteLineMark = Decoration.line({ class: 'cm-wysiwyg-blockquote-line' })
const codeBlockLineMark = Decoration.line({ class: 'cm-wysiwyg-codeblock-line' })
const codeBlockFirstLineMark = Decoration.line({ class: 'cm-wysiwyg-codeblock-line cm-wysiwyg-codeblock-first' })
const codeBlockLastLineMark = Decoration.line({ class: 'cm-wysiwyg-codeblock-line cm-wysiwyg-codeblock-last' })

// ========== 辅助函数 ==========

/**
 * 获取光标所在行的范围列表
 * 活跃行 = 光标所在行（包括选区覆盖的所有行）
 */
function getActiveLineRanges(view: EditorView): Array<{ from: number; to: number }> {
  const ranges: Array<{ from: number; to: number }> = []
  for (const sel of view.state.selection.ranges) {
    const startLine = view.state.doc.lineAt(sel.from)
    const endLine = view.state.doc.lineAt(sel.to)
    ranges.push({ from: startLine.from, to: endLine.to })
  }
  return ranges
}

/** 检查行是否与活跃范围有重叠 */
function lineIsActive(lineFrom: number, lineTo: number, activeRanges: Array<{ from: number; to: number }>): boolean {
  for (const r of activeRanges) {
    if (lineFrom <= r.to && lineTo >= r.from) return true
  }
  return false
}

/** 收集指定类型的所有子节点 */
function findChildren(node: SyntaxNode, typeName: string): SyntaxNode[] {
  const result: SyntaxNode[] = []
  let child = node.firstChild
  while (child) {
    if (child.name === typeName) {
      result.push(child)
    }
    child = child.nextSibling
  }
  return result
}

/** 找到第一个指定类型的子节点 */
function findChild(node: SyntaxNode, typeName: string): SyntaxNode | null {
  let child = node.firstChild
  while (child) {
    if (child.name === typeName) return child
    child = child.nextSibling
  }
  return null
}

/**
 * 将 Markdown 表格文本解析为 HTML 表格
 */
function markdownTableToHtml(text: string): string {
  const lines = text.split('\n').filter(l => l.trim().length > 0)
  if (lines.length < 2) return ''

  const parseRow = (line: string): string[] => {
    // 去掉首尾的 | 然后按 | 分割
    let trimmed = line.trim()
    if (trimmed.startsWith('|')) trimmed = trimmed.slice(1)
    if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1)
    return trimmed.split('|').map(cell => cell.trim())
  }

  // 检测对齐方式
  const delimLine = lines[1]
  const delimCells = parseRow(delimLine)
  const aligns: string[] = delimCells.map(cell => {
    const trimmed = cell.trim().replace(/\s/g, '')
    if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center'
    if (trimmed.endsWith(':')) return 'right'
    return 'left'
  })

  // 表头
  const headerCells = parseRow(lines[0])
  let html = '<table class="cm-wysiwyg-table"><thead><tr>'
  headerCells.forEach((cell, i) => {
    const align = aligns[i] || 'left'
    html += `<th style="text-align:${align}">${escapeHtml(cell)}</th>`
  })
  html += '</tr></thead>'

  // 表身
  if (lines.length > 2) {
    html += '<tbody>'
    for (let i = 2; i < lines.length; i++) {
      const cells = parseRow(lines[i])
      html += '<tr>'
      cells.forEach((cell, j) => {
        const align = aligns[j] || 'left'
        html += `<td style="text-align:${align}">${escapeHtml(cell)}</td>`
      })
      html += '</tr>'
    }
    html += '</tbody>'
  }

  html += '</table>'
  return html
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ========== 装饰项收集器 ==========

interface DecoCollector {
  lineItems: Array<{ from: number; deco: Decoration }>
  replaceItems: Array<{ from: number; to: number; deco: Decoration }>
  markItems: Array<{ from: number; to: number; deco: Decoration }>
}

function newCollector(): DecoCollector {
  return { lineItems: [], replaceItems: [], markItems: [] }
}

// ========== 构建装饰集 ==========

function buildDecorations(view: EditorView): DecorationSet {
  const activeRanges = getActiveLineRanges(view)
  const doc = view.state.doc
  const docLen = doc.length
  const c = newCollector()

  // 预先找出所有代码块范围
  const codeBlockRanges: Array<{ from: number; to: number }> = []
  const tree = syntaxTree(view.state)

  tree.iterate({
    enter: (nodeRef) => {
      if (nodeRef.name === 'FencedCode') {
        codeBlockRanges.push({ from: nodeRef.from, to: nodeRef.to })
      }
    },
  })

  function isInCodeBlock(pos: number): boolean {
    return codeBlockRanges.some(r => pos >= r.from && pos <= r.to)
  }

  /** 安全的范围检查 */
  function validReplace(from: number, to: number): boolean {
    return from >= 0 && to >= 0 && from <= docLen && to <= docLen && from < to
  }

  // 主遍历
  tree.iterate({
    enter: (nodeRef) => {
      const { from, to, name } = nodeRef
      const node = nodeRef.node

      // ====== 标题 (ATXHeading1 ~ ATXHeading6) ======
      if (/^ATXHeading[1-6]$/.test(name)) {
        const level = parseInt(name.charAt(name.length - 1))
        const line = doc.lineAt(from)
        if (lineIsActive(line.from, line.to, activeRanges)) return false

        // 添加行装饰
        c.lineItems.push({ from: line.from, deco: headingLineMarks[level] || headingLineMarks[6] })

        // 使用 HeaderMark 子节点精确定位 # 标记
        const headerMarks = findChildren(node, 'HeaderMark')
        if (headerMarks.length > 0) {
          // 第一个 HeaderMark 是开头的 ### 标记
          const firstMark = headerMarks[0]
          // 隐藏 ### 以及紧跟的空格
          let hideEnd = firstMark.to
          // 跳过 HeaderMark 后面的空格
          while (hideEnd < line.to && doc.sliceString(hideEnd, hideEnd + 1) === ' ') {
            hideEnd++
          }
          if (validReplace(firstMark.from, hideEnd)) {
            c.replaceItems.push({ from: firstMark.from, to: hideEnd, deco: Decoration.replace({}) })
          }

          // 如果有尾部 HeaderMark（如 `# title #`），也隐藏
          if (headerMarks.length > 1) {
            const lastMark = headerMarks[headerMarks.length - 1]
            // 也隐藏前面的空格
            let hideStart = lastMark.from
            while (hideStart > firstMark.to && doc.sliceString(hideStart - 1, hideStart) === ' ') {
              hideStart--
            }
            if (validReplace(hideStart, lastMark.to)) {
              c.replaceItems.push({ from: hideStart, to: lastMark.to, deco: Decoration.replace({}) })
            }
          }
        }
        return false
      }

      // ====== 加粗 (StrongEmphasis) ======
      if (name === 'StrongEmphasis' && !isInCodeBlock(from)) {
        if (lineIsActive(from, to, activeRanges)) return false
        // 使用 EmphasisMark 子节点定位 ** 或 __
        const marks = findChildren(node, 'EmphasisMark')
        if (marks.length >= 2) {
          const openMark = marks[0]
          const closeMark = marks[marks.length - 1]
          if (validReplace(openMark.from, openMark.to)) {
            c.replaceItems.push({ from: openMark.from, to: openMark.to, deco: Decoration.replace({}) })
          }
          if (validReplace(closeMark.from, closeMark.to)) {
            c.replaceItems.push({ from: closeMark.from, to: closeMark.to, deco: Decoration.replace({}) })
          }
          // 中间内容添加加粗样式
          if (openMark.to < closeMark.from) {
            c.markItems.push({ from: openMark.to, to: closeMark.from, deco: boldMark })
          }
        }
        return false
      }

      // ====== 斜体 (Emphasis) ======
      if (name === 'Emphasis' && !isInCodeBlock(from)) {
        if (lineIsActive(from, to, activeRanges)) return false
        const marks = findChildren(node, 'EmphasisMark')
        if (marks.length >= 2) {
          const openMark = marks[0]
          const closeMark = marks[marks.length - 1]
          if (validReplace(openMark.from, openMark.to)) {
            c.replaceItems.push({ from: openMark.from, to: openMark.to, deco: Decoration.replace({}) })
          }
          if (validReplace(closeMark.from, closeMark.to)) {
            c.replaceItems.push({ from: closeMark.from, to: closeMark.to, deco: Decoration.replace({}) })
          }
          if (openMark.to < closeMark.from) {
            c.markItems.push({ from: openMark.to, to: closeMark.from, deco: italicMark })
          }
        }
        return false
      }

      // ====== 删除线 (Strikethrough) ======
      if (name === 'Strikethrough' && !isInCodeBlock(from)) {
        if (lineIsActive(from, to, activeRanges)) return false
        const marks = findChildren(node, 'StrikethroughMark')
        if (marks.length >= 2) {
          const openMark = marks[0]
          const closeMark = marks[marks.length - 1]
          if (validReplace(openMark.from, openMark.to)) {
            c.replaceItems.push({ from: openMark.from, to: openMark.to, deco: Decoration.replace({}) })
          }
          if (validReplace(closeMark.from, closeMark.to)) {
            c.replaceItems.push({ from: closeMark.from, to: closeMark.to, deco: Decoration.replace({}) })
          }
          if (openMark.to < closeMark.from) {
            c.markItems.push({ from: openMark.to, to: closeMark.from, deco: strikethroughMark })
          }
        }
        return false
      }

      // ====== 行内代码 (InlineCode) ======
      if (name === 'InlineCode' && !isInCodeBlock(from)) {
        if (lineIsActive(from, to, activeRanges)) return false
        const codeMarks = findChildren(node, 'CodeMark')
        const codeText = findChild(node, 'CodeText')
        if (codeMarks.length >= 2 && codeText) {
          // 隐藏前后的反引号
          if (validReplace(codeMarks[0].from, codeMarks[0].to)) {
            c.replaceItems.push({ from: codeMarks[0].from, to: codeMarks[0].to, deco: Decoration.replace({}) })
          }
          const lastCodeMark = codeMarks[codeMarks.length - 1]
          if (validReplace(lastCodeMark.from, lastCodeMark.to)) {
            c.replaceItems.push({ from: lastCodeMark.from, to: lastCodeMark.to, deco: Decoration.replace({}) })
          }
          // 代码文本添加样式
          c.markItems.push({ from: codeText.from, to: codeText.to, deco: inlineCodeMark })
        }
        return false
      }

      // ====== 链接 [text](url) ======
      if (name === 'Link' && !isInCodeBlock(from)) {
        if (lineIsActive(from, to, activeRanges)) return false
        // Link 节点结构: LinkMark("[") ... LinkMark("]") LinkMark("(") URL LinkMark(")")
        const linkMarks = findChildren(node, 'LinkMark')

        if (linkMarks.length >= 2) {
          // 找到 [ 和 ] 的位置
          const openBracket = linkMarks[0] // [
          // ] 的 LinkMark 在第二个位置
          // 链接文本范围：[ 到 ] 之间
          const textStart = openBracket.to
          // 找到 ] 的 LinkMark（紧跟在链接文本后面的那个）
          let closeBracketIdx = 1
          for (let i = 1; i < linkMarks.length; i++) {
            if (doc.sliceString(linkMarks[i].from, linkMarks[i].to) === ']' ||
                doc.sliceString(linkMarks[i].from, linkMarks[i].to) === '](') {
              closeBracketIdx = i
              break
            }
          }
          const closeBracket = linkMarks[closeBracketIdx]
          const textEnd = closeBracket.from

          // 隐藏 [ 
          if (validReplace(openBracket.from, openBracket.to)) {
            c.replaceItems.push({ from: openBracket.from, to: openBracket.to, deco: Decoration.replace({}) })
          }
          // 链接文字添加样式
          if (textStart < textEnd) {
            c.markItems.push({ from: textStart, to: textEnd, deco: linkTextMark })
          }
          // 隐藏从 ] 到整个链接末尾的部分 (](url) 或 ](url "title"))
          if (validReplace(closeBracket.from, to)) {
            c.replaceItems.push({ from: closeBracket.from, to, deco: Decoration.replace({}) })
          }
        }
        return false
      }

      // ====== 图片 ![alt](url) ======
      if (name === 'Image' && !isInCodeBlock(from)) {
        if (lineIsActive(from, to, activeRanges)) return false
        // Image 节点结构类似 Link，但前面多一个 !
        const linkMarks = findChildren(node, 'LinkMark')

        if (linkMarks.length >= 2) {
          // 第一个 LinkMark 通常是 "![" 
          const openMark = linkMarks[0]
          const textStart = openMark.to

          // 找到 ] 或 ]( 的 LinkMark
          let closeBracketIdx = 1
          for (let i = 1; i < linkMarks.length; i++) {
            const markText = doc.sliceString(linkMarks[i].from, linkMarks[i].to)
            if (markText === ']' || markText === '](' || markText.startsWith(']')) {
              closeBracketIdx = i
              break
            }
          }
          const closeBracket = linkMarks[closeBracketIdx]
          const textEnd = closeBracket.from

          if (textStart < textEnd) {
            // 有 alt 文本
            // 隐藏 ![
            if (validReplace(openMark.from, openMark.to)) {
              c.replaceItems.push({ from: openMark.from, to: openMark.to, deco: Decoration.replace({}) })
            }
            // alt 文字加样式
            c.markItems.push({ from: textStart, to: textEnd, deco: imageMark })
            // 隐藏 ](url) 整个尾部
            if (validReplace(closeBracket.from, to)) {
              c.replaceItems.push({ from: closeBracket.from, to, deco: Decoration.replace({}) })
            }
          } else {
            // 无 alt 文本，整体替换为占位 widget
            c.replaceItems.push({
              from, to,
              deco: Decoration.replace({ widget: new ImagePlaceholderWidget('图片') }),
            })
          }
        }
        return false
      }

      // ====== 水平线 (HorizontalRule) ======
      if (name === 'HorizontalRule') {
        const line = doc.lineAt(from)
        if (!lineIsActive(line.from, line.to, activeRanges)) {
          if (validReplace(line.from, line.to)) {
            c.replaceItems.push({ from: line.from, to: line.to, deco: Decoration.replace({ widget: new HrWidget() }) })
          }
        }
        return false
      }

      // ====== 代码块 (FencedCode) ======
      if (name === 'FencedCode') {
        const startLine = doc.lineAt(from)
        const endLine = doc.lineAt(to)

        // 提取语言信息 —— 使用 CodeInfo 子节点
        const codeInfo = findChild(node, 'CodeInfo')
        const lang = codeInfo ? doc.sliceString(codeInfo.from, codeInfo.to) : ''

        for (let i = startLine.number; i <= endLine.number; i++) {
          const line = doc.line(i)
          if (lineIsActive(line.from, line.to, activeRanges)) continue

          if (i === startLine.number) {
            // 首行：添加代码块首行装饰，隐藏 ```lang 内容
            c.lineItems.push({ from: line.from, deco: codeBlockFirstLineMark })
            if (lang && line.text.trim().length > 3) {
              c.replaceItems.push({ from: line.from, to: line.to, deco: Decoration.replace({ widget: new CodeLangWidget(lang) }) })
            } else {
              // 无语言标识，隐藏整行 ``` 
              if (validReplace(line.from, line.to)) {
                c.replaceItems.push({ from: line.from, to: line.to, deco: Decoration.replace({}) })
              }
            }
          } else if (i === endLine.number) {
            // 末行：隐藏 ```
            c.lineItems.push({ from: line.from, deco: codeBlockLastLineMark })
            if (validReplace(line.from, line.to)) {
              c.replaceItems.push({ from: line.from, to: line.to, deco: Decoration.replace({}) })
            }
          } else {
            // 中间行：添加代码块行装饰，保留代码内容
            c.lineItems.push({ from: line.from, deco: codeBlockLineMark })
          }
        }
        return false
      }

      // ====== 引用 (Blockquote) ======
      if (name === 'Blockquote') {
        const startLine = doc.lineAt(from)
        const endLine = doc.lineAt(to)
        for (let i = startLine.number; i <= endLine.number; i++) {
          const line = doc.line(i)
          if (lineIsActive(line.from, line.to, activeRanges)) continue
          c.lineItems.push({ from: line.from, deco: blockquoteLineMark })
          // 隐藏行首的 > 标记
          const qMatch = line.text.match(/^(\s*>\s?)/)
          if (qMatch && validReplace(line.from, line.from + qMatch[0].length)) {
            c.replaceItems.push({ from: line.from, to: line.from + qMatch[0].length, deco: Decoration.replace({}) })
          }
        }
        return false
      }

      // ====== 表格 (Table) ======
      if (name === 'Table') {
        const startLine = doc.lineAt(from)
        const endLine = doc.lineAt(to)
        // 检查整个表格区域是否有活跃行
        if (lineIsActive(startLine.from, endLine.to, activeRanges)) {
          return false // 有活跃行时，显示原始 Markdown
        }

        // 获取表格的原始文本
        const tableText = doc.sliceString(from, to)
        const tableHtml = markdownTableToHtml(tableText)

        if (tableHtml) {
          // 将整个表格替换为一个 Widget
          // 注意：replace decoration 不能跨行，所以我们需要用一种特殊方式处理
          // 方案：第一行替换为表格 Widget，其余行隐藏
          const firstLine = startLine
          
          // 第一行替换为表格 Widget
          if (validReplace(firstLine.from, firstLine.to)) {
            c.replaceItems.push({
              from: firstLine.from,
              to: firstLine.to,
              deco: Decoration.replace({ widget: new TableWidget(tableHtml) }),
            })
          }

          // 后续行全部隐藏（使用空 replace + 行装饰让它们高度为 0）
          for (let i = startLine.number + 1; i <= endLine.number; i++) {
            const line = doc.line(i)
            c.lineItems.push({ from: line.from, deco: Decoration.line({ class: 'cm-wysiwyg-table-hidden-line' }) })
            if (line.text.length > 0 && validReplace(line.from, line.to)) {
              c.replaceItems.push({ from: line.from, to: line.to, deco: Decoration.replace({}) })
            }
          }
        }
        return false
      }

      // ====== 列表容器，继续遍历子节点 ======
      if (name === 'BulletList' || name === 'OrderedList') return

      // ====== 列表项 (ListItem) ======
      if (name === 'ListItem') {
        const line = doc.lineAt(from)
        if (lineIsActive(line.from, line.to, activeRanges)) return

        const text = line.text

        // 任务列表 - [ ] 或 - [x]
        const taskMatch = text.match(/^(\s*[-*+]\s+)\[([ xX])\]\s?/)
        if (taskMatch) {
          const isChecked = taskMatch[2].toLowerCase() === 'x'
          const replaceEnd = line.from + taskMatch[0].length
          if (validReplace(line.from, replaceEnd)) {
            c.replaceItems.push({
              from: line.from,
              to: replaceEnd,
              deco: Decoration.replace({ widget: new CheckboxWidget(isChecked) }),
            })
          }
          return false
        }

        // 有序列表
        const orderedMatch = text.match(/^(\s*)(\d+)\.\s/)
        if (orderedMatch) {
          const markerStart = line.from + orderedMatch[1].length
          const markerEnd = line.from + orderedMatch[0].length
          if (validReplace(markerStart, markerEnd)) {
            c.replaceItems.push({
              from: markerStart,
              to: markerEnd,
              deco: Decoration.replace({ widget: new OrderedNumberWidget(orderedMatch[2]) }),
            })
          }
          return
        }

        // 无序列表
        const bulletMatch = text.match(/^(\s*)([-*+])\s/)
        if (bulletMatch) {
          const markerStart = line.from + bulletMatch[1].length
          const markerEnd = line.from + bulletMatch[0].length
          if (validReplace(markerStart, markerEnd)) {
            c.replaceItems.push({
              from: markerStart,
              to: markerEnd,
              deco: Decoration.replace({ widget: new BulletWidget() }),
            })
          }
        }
        return
      }
    },
  })

  // ========== 构建三组独立的 DecorationSet 然后合并 ==========
  return buildFinalDecoSet(c, docLen)
}

/**
 * 将收集到的装饰项构建为最终的 DecorationSet
 */
function buildFinalDecoSet(c: DecoCollector, docLen: number): DecorationSet {
  // 1. Line decorations（行装饰）
  c.lineItems.sort((a, b) => a.from - b.from)
  const lineBuilder = new RangeSetBuilder<Decoration>()
  const usedLinePos = new Set<number>()
  for (const item of c.lineItems) {
    if (item.from < 0 || item.from > docLen) continue
    if (usedLinePos.has(item.from)) continue
    usedLinePos.add(item.from)
    try {
      lineBuilder.add(item.from, item.from, item.deco)
    } catch { /* 跳过 */ }
  }
  const lineSet = lineBuilder.finish()

  // 2. Replace decorations（替换装饰，不允许重叠）
  c.replaceItems.sort((a, b) => a.from !== b.from ? a.from - b.from : a.to - b.to)
  const replaceBuilder = new RangeSetBuilder<Decoration>()
  let lastEnd = -1
  for (const item of c.replaceItems) {
    if (item.from < lastEnd) continue // 跳过重叠
    if (item.from < 0 || item.to > docLen) continue
    try {
      replaceBuilder.add(item.from, item.to, item.deco)
      lastEnd = item.to
    } catch { /* 跳过 */ }
  }
  const replaceSet = replaceBuilder.finish()

  // 3. Mark decorations（标记装饰，允许嵌套但需要正确排序）
  c.markItems.sort((a, b) => a.from !== b.from ? a.from - b.from : a.to - b.to)
  const markBuilder = new RangeSetBuilder<Decoration>()
  for (const item of c.markItems) {
    if (item.from < 0 || item.to > docLen) continue
    try {
      markBuilder.add(item.from, item.to, item.deco)
    } catch { /* 跳过 */ }
  }
  const markSet = markBuilder.finish()

  // 合并三组装饰
  return mergeDecoSets(lineSet, replaceSet, markSet)
}

/**
 * 将 DecorationSet 转为数组
 */
function decoSetToArray(set: DecorationSet): Array<{ from: number; to: number; value: Decoration }> {
  const arr: Array<{ from: number; to: number; value: Decoration }> = []
  const cursor = set.iter()
  while (cursor.value) {
    arr.push({ from: cursor.from, to: cursor.to, value: cursor.value })
    cursor.next()
  }
  return arr
}

/**
 * 合并多个 DecorationSet
 */
function mergeDecoSets(...sets: DecorationSet[]): DecorationSet {
  const all: Array<{ from: number; to: number; value: Decoration }> = []
  for (const set of sets) {
    all.push(...decoSetToArray(set))
  }

  // 排序：from 升序；from 相同时 point(from===to) 优先
  all.sort((a, b) => {
    if (a.from !== b.from) return a.from - b.from
    const aPoint = a.from === a.to ? 0 : 1
    const bPoint = b.from === b.to ? 0 : 1
    if (aPoint !== bPoint) return aPoint - bPoint
    return a.to - b.to
  })

  const builder = new RangeSetBuilder<Decoration>()
  for (const item of all) {
    try {
      builder.add(item.from, item.to, item.value)
    } catch { /* 跳过无效装饰 */ }
  }
  return builder.finish()
}

// ========== ViewPlugin ==========

const wysiwygPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
)

/**
 * WYSIWYG 模式的编辑器主题
 */
const wysiwygTheme = EditorView.theme({
  // 隐藏行号
  '.cm-gutters': {
    display: 'none !important',
  },
  // 活跃行高亮
  '.cm-activeLine': {
    backgroundColor: 'rgba(0, 122, 255, 0.04)',
    borderRadius: '3px',
  },
  // 编辑器内容区域适配
  '.cm-content': {
    fontFamily: 'var(--editor-font-family)',
    fontSize: 'var(--editor-font-size)',
    lineHeight: 'var(--editor-line-height)',
  },
})

/**
 * 获取 WYSIWYG 扩展
 */
export function getWysiwygExtension(): Extension[] {
  return [wysiwygPlugin, wysiwygTheme]
}

/**
 * 空扩展（WYSIWYG 模式关闭时使用）
 */
export function getEmptyExtension(): Extension[] {
  return []
}
