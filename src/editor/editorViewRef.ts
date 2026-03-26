import { EditorView } from '@codemirror/view'

/**
 * 编辑器视图引用管理器
 * 用于在组件之间共享 EditorView 实例
 * （菜单操作、大纲跳转等需要直接操作编辑器）
 */

/** 全局 EditorView 引用 */
let globalEditorView: EditorView | null = null

export function setGlobalEditorView(view: EditorView | null) {
  globalEditorView = view
}

export function getGlobalEditorView(): EditorView | null {
  return globalEditorView
}
