import { useEffect, useRef, useCallback } from 'react'
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
import { copyAsHtml, copyAsMarkdown, pasteAsPlainText, handlePasteImage } from '../../utils/clipboard'
import ContextMenu from './ContextMenu'

/** 主题隔间 —— 用于动态切换主题 */
const themeCompartment = new Compartment()

/**
 * 编辑器核心组件 —— Typora 风格
 * 基于 CodeMirror 6，居中排版，沉浸式写作
 */
function Editor() {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  /** 标志位：正在进行文件切换同步，此时不应触发 isModified */
  const isSyncingFile = useRef(false)
  const { currentFile, updateContent } = useFileStore()
  const { setWordCount, zoomLevel, setSelectionWordCount } = useEditorStore()
  const { theme } = useThemeStore()

  // 文档变更监听
  const handleDocChange = useCallback((content: string) => {
    // 如果是文件切换引起的内容同步，不标记为已修改
    if (isSyncingFile.current) return
    updateContent(content)
    setWordCount(countWords(content))
  }, [updateContent, setWordCount])

  // 初始化编辑器
  useEffect(() => {
    if (!editorRef.current) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        handleDocChange(update.state.doc.toString())
      }
      // 选区变化时统计选区字数
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

    const state = EditorState.create({
      doc: currentFile.content,
      extensions: [
        basicSetup,
        keymap.of([...defaultKeymap, indentWithTab]),
        markdownKeymap(),
        // 智能剪贴板快捷键（仅处理复制，粘贴通过 DOM paste 事件处理）
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
          // 不再拦截 Mod-v：让 DOM paste 事件自然触发，
          // 由 pasteHandler 处理智能粘贴（图片/URL），普通文本走 CodeMirror 默认粘贴
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
      ],
    })

    const view = new EditorView({
      state,
      parent: editorRef.current,
    })

    viewRef.current = view
    setGlobalEditorView(view)

    // 注册 DOM paste 事件：处理截图粘贴和智能粘贴（URL 链接/图片 URL）
    const pasteHandler = (e: ClipboardEvent) => {
      if (!viewRef.current) return

      // 优先处理图片粘贴
      const hasImage = e.clipboardData?.items
        ? Array.from(e.clipboardData.items).some((item) => item.type.startsWith('image/'))
        : false
      if (hasImage) {
        handlePasteImage(e, viewRef.current)
        return
      }

      // 处理智能文本粘贴（URL 链接、图片 URL）
      const plainText = e.clipboardData?.getData('text/plain')
      if (plainText) {
        const trimmed = plainText.trim()
        const view = viewRef.current
        const { state } = view
        const range = state.selection.main
        const selectedText = state.sliceDoc(range.from, range.to)

        // 检查是否是图片 URL
        const imgPattern = /^https?:\/\/\S+\.(png|jpg|jpeg|gif|webp|svg|bmp|ico)(\?.*)?$/i
        if (imgPattern.test(trimmed)) {
          e.preventDefault()
          const insert = `![${selectedText || '图片'}](${trimmed})`
          view.dispatch({
            changes: { from: range.from, to: range.to, insert },
            selection: { anchor: range.from + insert.length },
            scrollIntoView: true,
          })
          return
        }

        // 检查是否是 URL（且有选中文本时包裹为链接）
        const urlPattern = /^https?:\/\/\S+$/
        if (urlPattern.test(trimmed)) {
          e.preventDefault()
          if (selectedText) {
            const insert = `[${selectedText}](${trimmed})`
            view.dispatch({
              changes: { from: range.from, to: range.to, insert },
              selection: { anchor: range.from + insert.length },
              scrollIntoView: true,
            })
          } else {
            const insert = `[](${trimmed})`
            view.dispatch({
              changes: { from: range.from, to: range.to, insert },
              selection: { anchor: range.from + 1 },
              scrollIntoView: true,
            })
          }
          return
        }
      }

      // 普通文本：不调用 preventDefault()，让 CodeMirror 默认 paste 处理
    }
    const editorEl = editorRef.current
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

    const currentContent = view.state.doc.toString()
    if (currentContent !== currentFile.content) {
      // 标记为文件同步，防止 docChanged 回调设置 isModified
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

  // 主题切换 —— 使用 Compartment 动态重配置
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    view.dispatch({
      effects: themeCompartment.reconfigure(getEditorTheme(theme)),
    })
  }, [theme])

  return (
    <div
      className="editor-wrapper"
      style={{ fontSize: `${zoomLevel}%` }}
    >
      <div className="editor-content-area">
        <div ref={editorRef} />
      </div>
      <ContextMenu editorView={viewRef.current} />
    </div>
  )
}

export default Editor
