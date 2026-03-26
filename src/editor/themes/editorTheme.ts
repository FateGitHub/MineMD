import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import type { Extension } from '@codemirror/state'

/**
 * Apple HIG 风格亮色主题
 * 干净、精致、沉浸式写作
 */
const lightTheme = EditorView.theme({
  '&': {
    color: '#1d1d1f',
    backgroundColor: '#ffffff',
    fontSize: 'var(--editor-font-size, 16px)',
  },
  '.cm-content': {
    fontFamily: 'var(--editor-font-family)',
    caretColor: '#007aff',
    lineHeight: 'var(--editor-line-height, 1.6)',
  },
  '.cm-cursor': {
    borderLeftColor: '#007aff',
    borderLeftWidth: '2px',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  /* 行号区域样式 */
  '.cm-gutters': {
    backgroundColor: '#ffffff',
    color: '#c7c7cc',
    border: 'none',
    paddingRight: '4px',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    fontFamily: 'var(--editor-mono-font)',
    fontSize: '12px',
    minWidth: '32px',
    padding: '0 8px 0 4px',
  },
  '.cm-line': {
    padding: '0',
  },
})

/**
 * 亮色主题 Markdown 语法高亮
 */
const lightHighlightStyle = HighlightStyle.define([
  // 标题
  { tag: tags.heading1, color: '#1d1d1f', fontWeight: '700', fontSize: '1.6em' },
  { tag: tags.heading2, color: '#1d1d1f', fontWeight: '600', fontSize: '1.4em' },
  { tag: tags.heading3, color: '#1d1d1f', fontWeight: '600', fontSize: '1.2em' },
  { tag: tags.heading4, color: '#1d1d1f', fontWeight: '600' },
  { tag: tags.heading5, color: '#1d1d1f', fontWeight: '600' },
  { tag: tags.heading6, color: '#636366', fontWeight: '600' },
  // 加粗、斜体、删除线
  { tag: tags.strong, color: '#1d1d1f', fontWeight: '600' },
  { tag: tags.emphasis, color: '#1d1d1f', fontStyle: 'italic' },
  { tag: tags.strikethrough, color: '#86868b', textDecoration: 'line-through' },
  // 链接
  { tag: tags.link, color: '#007aff', textDecoration: 'underline' },
  { tag: tags.url, color: '#007aff' },
  // 行内代码
  { tag: tags.monospace, color: '#d63384', fontFamily: 'var(--editor-mono-font)' },
  // 引用
  { tag: tags.quote, color: '#86868b', fontStyle: 'italic' },
  // 列表标记
  { tag: tags.list, color: '#007aff' },
  // Markdown 语法符号（#、*、-、```等）
  { tag: tags.processingInstruction, color: '#c7c7cc' },
  { tag: tags.meta, color: '#86868b' },
  // 代码块内容
  { tag: tags.content, color: '#1d1d1f' },
  // HTML 标签
  { tag: tags.angleBracket, color: '#86868b' },
  { tag: tags.tagName, color: '#d63384' },
  { tag: tags.attributeName, color: '#007aff' },
  { tag: tags.attributeValue, color: '#28a745' },
])

/**
 * Apple HIG 风格暗色主题
 */
const darkTheme = EditorView.theme(
  {
    '&': {
      color: '#f5f5f7',
      backgroundColor: '#1c1c1e',
      fontSize: 'var(--editor-font-size, 16px)',
    },
    '.cm-content': {
      fontFamily: 'var(--editor-font-family)',
      caretColor: '#0a84ff',
      lineHeight: 'var(--editor-line-height, 1.6)',
    },
    '.cm-cursor': {
      borderLeftColor: '#0a84ff',
      borderLeftWidth: '2px',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: 'rgba(10, 132, 255, 0.3)',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },
    /* 行号区域样式 */
    '.cm-gutters': {
      backgroundColor: '#1c1c1e',
      color: '#48484a',
      border: 'none',
      paddingRight: '4px',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      fontFamily: 'var(--editor-mono-font)',
      fontSize: '12px',
      minWidth: '32px',
      padding: '0 8px 0 4px',
    },
    '.cm-line': {
      padding: '0',
    },
  },
  { dark: true },
)

/**
 * 暗色主题 Markdown 语法高亮 —— 专为暗色背景优化，确保清晰可读
 */
const darkHighlightStyle = HighlightStyle.define([
  // 标题 —— 白色高亮，醒目
  { tag: tags.heading1, color: '#f5f5f7', fontWeight: '700', fontSize: '1.6em' },
  { tag: tags.heading2, color: '#f5f5f7', fontWeight: '600', fontSize: '1.4em' },
  { tag: tags.heading3, color: '#f5f5f7', fontWeight: '600', fontSize: '1.2em' },
  { tag: tags.heading4, color: '#f5f5f7', fontWeight: '600' },
  { tag: tags.heading5, color: '#f5f5f7', fontWeight: '600' },
  { tag: tags.heading6, color: '#98989d', fontWeight: '600' },
  // 加粗、斜体、删除线
  { tag: tags.strong, color: '#f5f5f7', fontWeight: '600' },
  { tag: tags.emphasis, color: '#e5e5e7', fontStyle: 'italic' },
  { tag: tags.strikethrough, color: '#636366', textDecoration: 'line-through' },
  // 链接 —— Apple 蓝色，暗色适配
  { tag: tags.link, color: '#64d2ff', textDecoration: 'underline' },
  { tag: tags.url, color: '#64d2ff' },
  // 行内代码 —— 粉色，暗色适配
  { tag: tags.monospace, color: '#ff6b9d', fontFamily: 'var(--editor-mono-font)' },
  // 引用
  { tag: tags.quote, color: '#98989d', fontStyle: 'italic' },
  // 列表标记
  { tag: tags.list, color: '#0a84ff' },
  // Markdown 语法符号（#、*、-、```等）—— 柔和灰色
  { tag: tags.processingInstruction, color: '#636366' },
  { tag: tags.meta, color: '#98989d' },
  // 代码块内容 —— 保持亮白
  { tag: tags.content, color: '#f5f5f7' },
  // HTML 标签
  { tag: tags.angleBracket, color: '#98989d' },
  { tag: tags.tagName, color: '#ff6b9d' },
  { tag: tags.attributeName, color: '#64d2ff' },
  { tag: tags.attributeValue, color: '#30d158' },
])

/**
 * 根据主题名获取编辑器主题扩展
 * 返回编辑器基础主题 + 语法高亮样式
 */
export function getEditorTheme(theme: string): Extension {
  if (theme === 'dark') {
    return [darkTheme, syntaxHighlighting(darkHighlightStyle)]
  }
  return [lightTheme, syntaxHighlighting(lightHighlightStyle)]
}
