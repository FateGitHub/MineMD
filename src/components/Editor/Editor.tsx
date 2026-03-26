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
import { copyAsHtml, copyAsMarkdown, pasteAsPlainText, smartPaste, handlePasteImage } from '../../utils/clipboard'
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
              // smartPaste 是异步函数，需要在它返回 false 时手动执行默认粘贴
              smartPaste(view).then((handled) => {
                if (!handled) {
                  // 智能粘贴未处理，执行默认粘贴（插入纯文本）
                  navigator.clipboard.readText().then((text) => {
                    if (text) {
                      const range = view.state.selection.main
                      view.dispatch({
                        changes: { from: range.from, to: range.to, insert: text },
                        selection: { anchor: range.from + text.length },
                        scrollIntoView: true,
                      })
                    }
                  }).catch(() => { /* 剪贴板读取失败，忽略 */ })
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
      ],
    })

    const view = new EditorView({
      state,
      parent: editorRef.current,
    })

    viewRef.current = view
    setGlobalEditorView(view)

    // 注册 DOM paste 事件：处理截图粘贴（通过 DOM 事件可直接获取剪贴板中的图片文件）
    const pasteHandler = (e: ClipboardEvent) => {
      // 检查是否有图片数据
      const hasImage = e.clipboardData?.items
        ? Array.from(e.clipboardData.items).some((item) => item.type.startsWith('image/'))
        : false
      if (hasImage && viewRef.current) {
        handlePasteImage(e, viewRef.current)
      }
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
