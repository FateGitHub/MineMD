import { Component, useEffect, useRef, useCallback } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState, Compartment } from '@codemirror/state'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { keymap } from '@codemirror/view'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { search } from '@codemirror/search'
import { useFileStore } from '../../stores/fileStore'
import { useEditorStore } from '../../stores/editorStore'
import { useThemeStore } from '../../stores/themeStore'
import { getEditorTheme } from '../../editor/themes/editorTheme'
import { markdownKeymap } from '../../editor/keymaps/markdownKeymap'
import { countWords } from '../../utils/wordCount'
import { setGlobalEditorView } from '../../editor/editorViewRef'
import { copyAsHtml, copyAsMarkdown, pasteAsPlainText, smartPaste, handlePasteImage } from '../../utils/clipboard'
import { getWysiwygBlockExtension, setWysiwygFileDir } from '../../editor/extensions/wysiwygBlockRenderer'

/** 主题隔间 */
const themeCompartment = new Compartment()

/**
 * Error Boundary —— 捕获 WYSIWYG 编辑器的运行时错误
 * 出错时显示错误信息并提供重试按钮，避免整个 app 崩溃
 */
class WysiwygErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error } {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[WysiwygEditor] 渲染错误:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--editor-text)',
          fontSize: '14px',
          gap: '12px',
        }}>
          <p style={{ opacity: 0.6 }}>WYSIWYG 模式加载失败</p>
          <p style={{ opacity: 0.4, fontSize: '12px' }}>
            {this.state.error?.message || '未知错误'}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: '1px solid var(--editor-border, #ccc)',
                background: 'var(--editor-bg, #fff)',
                color: 'var(--editor-text, #333)',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              重试
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                useEditorStore.getState().setViewMode('source')
              }}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                background: 'var(--editor-accent, #4a9eff)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              切换到源码模式
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * WYSIWYG 编辑器核心 —— Typora 风格行级即时渲染
 *
 * 核心原理：
 * - 使用 CodeMirror 编辑器 + 自定义 ViewPlugin
 * - 光标所在的 Markdown 块显示源码，可直接编辑
 * - 光标离开后（回车/点击其他位置），该块立即渲染为 HTML
 * - 所有非活跃块始终显示渲染后的 HTML
 * - 渲染效果与 Preview 模式一致（使用相同的 markdown-body 样式）
 */
function WysiwygEditorInner() {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const isSyncingFile = useRef(false)
  const { currentFile, updateContent } = useFileStore()
  const { setWordCount, zoomLevel, setSelectionWordCount } = useEditorStore()
  const { theme } = useThemeStore()

  // 文档变更监听
  const handleDocChange = useCallback((content: string) => {
    if (isSyncingFile.current) return
    updateContent(content)
    setWordCount(countWords(content))
  }, [updateContent, setWordCount])

  // 初始化 CodeMirror 编辑器
  useEffect(() => {
    if (!editorRef.current) return

    // 设置当前文件目录，用于 WYSIWYG 渲染器解析本地图片的相对路径
    if (currentFile.filePath) {
      const normalized = currentFile.filePath.replace(/\\/g, '/')
      const lastSlash = normalized.lastIndexOf('/')
      setWysiwygFileDir(lastSlash >= 0 ? normalized.substring(0, lastSlash) : null)
    } else {
      setWysiwygFileDir(null)
    }

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        handleDocChange(update.state.doc.toString())
      }
      if (update.selectionSet) {
        const { from, to } = update.state.selection.main
        if (from !== to) {
          const selectedText = update.state.sliceDoc(from, to)
          setSelectionWordCount(countWords(selectedText))
        } else {
          setSelectionWordCount(null)
        }
      }
    })

    // 获取 WYSIWYG 块级渲染扩展（带错误保护）
    let wysiwygExt
    try {
      wysiwygExt = getWysiwygBlockExtension()
    } catch (err) {
      console.error('[WysiwygEditor] 加载 WYSIWYG 扩展失败:', err)
      wysiwygExt = []
    }

    const state = EditorState.create({
      doc: currentFile.content,
      extensions: [
        basicSetup,
        keymap.of([...defaultKeymap, indentWithTab]),
        markdownKeymap(),
        // 智能剪贴板快捷键
        keymap.of([
          {
            key: 'Mod-c',
            run: (view) => copyAsHtml(view),
          },
          {
            key: 'Mod-Shift-c',
            run: (view) => copyAsMarkdown(view),
          },
          {
            key: 'Mod-Shift-v',
            run: (view) => {
              pasteAsPlainText(view)
              return true
            },
          },
          {
            key: 'Mod-v',
            run: (view) => {
              smartPaste(view).then((handled) => {
                if (!handled) {
                  navigator.clipboard.readText().then((text) => {
                    if (text) {
                      const range = view.state.selection.main
                      view.dispatch({
                        changes: { from: range.from, to: range.to, insert: text },
                        selection: { anchor: range.from + text.length },
                        scrollIntoView: true,
                      })
                    }
                  }).catch(() => { /* 忽略 */ })
                }
              })
              return true
            },
          },
        ]),
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        search(),
        updateListener,
        themeCompartment.of(getEditorTheme(theme)),
        EditorView.lineWrapping,
        // Typora 风格：编辑器占满宽度
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
        }),
        // WYSIWYG 块级渲染扩展 —— 核心
        ...wysiwygExt,
      ],
    })

    const view = new EditorView({
      state,
      parent: editorRef.current,
    })

    viewRef.current = view
    setGlobalEditorView(view)

    // 注册 DOM paste 事件
    const editorEl = editorRef.current
    const pasteHandler = (e: ClipboardEvent) => {
      const hasImage = e.clipboardData?.items
        ? Array.from(e.clipboardData.items).some((item) => item.type.startsWith('image/'))
        : false
      if (hasImage && viewRef.current) {
        handlePasteImage(e, viewRef.current)
      }
    }
    editorEl.addEventListener('paste', pasteHandler)

    // 初始统计字数
    setWordCount(countWords(currentFile.content))

    return () => {
      editorEl.removeEventListener('paste', pasteHandler)
      view.destroy()
      viewRef.current = null
      setGlobalEditorView(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 文件切换时同步内容
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    // 更新文件目录（用于本地图片路径解析）
    if (currentFile.filePath) {
      const normalized = currentFile.filePath.replace(/\\/g, '/')
      const lastSlash = normalized.lastIndexOf('/')
      setWysiwygFileDir(lastSlash >= 0 ? normalized.substring(0, lastSlash) : null)
    } else {
      setWysiwygFileDir(null)
    }

    const currentContent = view.state.doc.toString()
    if (currentContent !== currentFile.content) {
      isSyncingFile.current = true
      view.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: currentFile.content,
        },
      })
      isSyncingFile.current = false
      setWordCount(countWords(currentFile.content))
    }
  }, [currentFile.filePath, currentFile.content, setWordCount])

  // 主题切换
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: themeCompartment.reconfigure(getEditorTheme(theme)),
    })
  }, [theme])

  return (
    <div
      className="editor-wrapper wysiwyg-wrapper"
      style={{ fontSize: `${zoomLevel}%` }}
    >
      <div className="editor-content-area">
        <div ref={editorRef} />
      </div>
    </div>
  )
}

/**
 * WYSIWYG 编辑器组件（带 Error Boundary 保护）
 */
function WysiwygEditor() {
  return (
    <WysiwygErrorBoundary>
      <WysiwygEditorInner />
    </WysiwygErrorBoundary>
  )
}

export default WysiwygEditor
