import { useEffect, useCallback } from 'react'
import { EditorView } from '@codemirror/view'
import Sidebar from './components/Sidebar/Sidebar'
import Editor from './components/Editor/Editor'
import Preview from './components/Editor/Preview'
import WysiwygEditor from './components/Editor/WysiwygEditor'
import Toolbar from './components/Toolbar/Toolbar'
import StatusBar from './components/StatusBar/StatusBar'
import TitleBar from './components/TitleBar/TitleBar'
import QuickOpen from './components/Modal/QuickOpen'
import GlobalSearch from './components/Modal/GlobalSearch'
import VersionHistory from './components/Modal/VersionHistory'
import { useThemeStore, restoreThemeSettings } from './stores/themeStore'
import { useEditorStore } from './stores/editorStore'
import { useFileStore } from './stores/fileStore'
import { useVersionStore } from './stores/versionStore'
import { useAutoSave } from './hooks/useAutoSave'
import { getGlobalEditorView } from './editor/editorViewRef'
import {
  toggleBold,
  toggleItalic,
  toggleUnderline,
  toggleStrikethrough,
  toggleInlineCode,
  toggleInlineMath,
  toggleHighlight,
  setHeading,
  insertCodeBlock,
  insertMathBlock,
  toggleBlockquote,
  toggleOrderedList,
  toggleUnorderedList,
  toggleTaskList,
  insertTable,
  insertHorizontalRule,
  insertLink,
  insertImage,
  formatDocument,
  clearContent,
} from './editor/commands/markdownCommands'
import { exportToPdf, exportToHtml, exportToHtmlPlain, printDocument } from './utils/export'

/**
 * 编辑器命令映射表
 * 将菜单 action 字符串映射到编辑器命令函数，避免冗长的 switch-case
 */
const editorCommandMap: Record<string, (view: EditorView) => void> = {
  // 段落格式
  'paragraph:h1': (v) => setHeading(v, 1),
  'paragraph:h2': (v) => setHeading(v, 2),
  'paragraph:h3': (v) => setHeading(v, 3),
  'paragraph:h4': (v) => setHeading(v, 4),
  'paragraph:h5': (v) => setHeading(v, 5),
  'paragraph:h6': (v) => setHeading(v, 6),
  'paragraph:codeBlock': insertCodeBlock,
  'paragraph:mathBlock': insertMathBlock,
  'paragraph:quote': toggleBlockquote,
  'paragraph:orderedList': toggleOrderedList,
  'paragraph:unorderedList': toggleUnorderedList,
  'paragraph:taskList': toggleTaskList,
  'paragraph:table': insertTable,
  'paragraph:hr': insertHorizontalRule,
  // 行内格式
  'format:bold': toggleBold,
  'format:italic': toggleItalic,
  'format:underline': toggleUnderline,
  'format:strikethrough': toggleStrikethrough,
  'format:inlineCode': toggleInlineCode,
  'format:inlineMath': toggleInlineMath,
  'format:link': insertLink,
  'format:image': insertImage,
  'format:highlight': toggleHighlight,
  // 文档操作
  'edit:format': formatDocument,
  'edit:clear': clearContent,
}

/**
 * 应用根组件 —— Typora 风格布局
 * 布局: 标题栏 + [侧边栏 | 编辑器] + 状态栏
 */
function App() {
  const { theme } = useThemeStore()
  const {
    sidebarVisible,
    viewMode,
    quickOpenVisible,
    globalSearchVisible,
    versionHistoryVisible,
  } = useEditorStore()

  // 启用自动保存
  useAutoSave()

  // 应用启动时恢复上次会话（打开的文件夹和文件）及主题设置
  useEffect(() => {
    restoreThemeSettings()
    useFileStore.getState().restoreLastSession()

    // 监听新窗口打开文件的事件（从其他窗口发送）
    if (window.electronAPI?.onOpenFile) {
      window.electronAPI.onOpenFile((filePath: string) => {
        useFileStore.getState().openFileByPath(filePath)
      })
    }
  }, [])

  // 设置主题 class
  useEffect(() => {
    document.documentElement.className = theme
  }, [theme])

  // 处理菜单事件和全局快捷键
  // 注意：使用 getState() 获取最新状态，避免闭包陷阱导致状态过期
  const handleMenuAction = useCallback((action: string) => {
    const fileStore = useFileStore.getState()
    const editorState = useEditorStore.getState()

    /**
     * 延迟执行格式化命令
     * 当从纯预览模式切回源码模式时，需要等 Editor 组件显示后才能获取 view
     */
    const runWithView = (fn: (view: EditorView) => void) => {
      const view = getGlobalEditorView()
      if (view) {
        fn(view)
      } else {
        editorState.setViewMode('source')
        setTimeout(() => {
          const delayedView = getGlobalEditorView()
          if (delayedView) fn(delayedView)
        }, 100)
      }
    }

    // 优先检查编辑器命令映射表
    if (action in editorCommandMap) {
      runWithView(editorCommandMap[action])
      return
    }

    switch (action) {
      // ====== 文件操作 ======
      case 'file:new':
        fileStore.newFile()
        break
      case 'file:open':
        fileStore.openFile()
        break
      case 'file:save':
        if (fileStore.currentFile.filePath) {
          useVersionStore.getState().addVersion(
            fileStore.currentFile.filePath,
            fileStore.currentFile.fileName,
            fileStore.currentFile.content,
          )
        }
        fileStore.saveCurrentFile()
        break
      case 'file:saveAs':
        fileStore.saveFileAs()
        break
      case 'folder:open':
        fileStore.openFolder()
        break

      // ====== 导出 ======
      case 'export:pdf':
        exportToPdf(fileStore.currentFile.content, fileStore.currentFile.fileName)
        break
      case 'export:html':
        exportToHtml(fileStore.currentFile.content, fileStore.currentFile.fileName)
        break
      case 'export:htmlPlain':
        exportToHtmlPlain(fileStore.currentFile.content, fileStore.currentFile.fileName)
        break

      // ====== 打印 ======
      case 'file:print':
        printDocument()
        break

      // ====== 编辑/查找（find 和 replace 共用相同逻辑）======
      case 'edit:find':
      case 'edit:replace':
        runWithView((view) => {
          import('@codemirror/search').then(({ openSearchPanel }) => {
            openSearchPanel(view)
          })
        })
        break

      // ====== 视图 ======
      case 'view:toggleSidebar':
        editorState.toggleSidebar()
        break
      case 'view:sourceMode':
        editorState.setViewMode('source')
        break
      case 'view:livePreview':
        editorState.setViewMode('live')
        break
      case 'view:previewMode':
        editorState.setViewMode('preview')
        break
      case 'view:wysiwygMode':
        editorState.setViewMode('wysiwyg')
        break
      case 'view:outline':
        editorState.setSidebarTab('outline')
        if (!editorState.sidebarVisible) {
          editorState.toggleSidebar()
        }
        break
      case 'view:zoomIn':
        editorState.zoomIn()
        break
      case 'view:zoomOut':
        editorState.zoomOut()
        break
      case 'view:zoomReset':
        editorState.zoomReset()
        break

      // ====== 主题 ======
      case 'theme:light':
        useThemeStore.getState().setTheme('light')
        break
      case 'theme:dark':
        useThemeStore.getState().setTheme('dark')
        break

      // ====== 弹窗 ======
      case 'quickOpen':
        useEditorStore.getState().setQuickOpenVisible(true)
        break
      case 'globalSearch':
        useEditorStore.getState().setGlobalSearchVisible(true)
        break
      case 'versionHistory':
        useEditorStore.getState().setVersionHistoryVisible(true)
        break

      default:
        break
    }
  }, []) // 无依赖！所有状态通过 getState() 获取，避免闭包陷阱和频繁重注册

  // 监听菜单事件
  useEffect(() => {
    window.electronAPI?.onMenuAction(handleMenuAction)
    return () => {
      window.electronAPI?.removeMenuActionListener()
    }
  }, [handleMenuAction])

  // 全局快捷键（菜单之外的快捷键）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey

      // Ctrl+P: 快速打开
      if (mod && e.key === 'p') {
        e.preventDefault()
        useEditorStore.getState().setQuickOpenVisible(true)
      }

      // Ctrl+Shift+F: 全局搜索
      if (mod && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        useEditorStore.getState().setGlobalSearchVisible(true)
      }

      // Ctrl+Shift+R: 即时渲染模式
      if (mod && e.shiftKey && e.key === 'R') {
        e.preventDefault()
        const currentMode = useEditorStore.getState().viewMode
        useEditorStore.getState().setViewMode(currentMode === 'wysiwyg' ? 'source' : 'wysiwyg')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="app-container">
      {/* 标题栏 —— Typora 极简风格 */}
      <TitleBar />

      {/* 工具栏 —— 常用操作快捷按钮 */}
      <Toolbar />

      {/* 主内容区：侧边栏 + 编辑器 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 侧边栏 */}
        <div className={`sidebar-wrapper sidebar-transition ${!sidebarVisible ? 'collapsed' : ''}`}>
          <Sidebar />
        </div>

        {/* 编辑器/预览 —— 四模式布局 */}
        <div className={`editor-main-area mode-${viewMode}`}>
          {/* WYSIWYG 模式使用独立的 WysiwygEditor 组件 */}
          {viewMode === 'wysiwyg' ? (
            <div className="editor-pane">
              <WysiwygEditor />
            </div>
          ) : (
            <>
              {/* 编辑器始终保持挂载，避免切换模式时销毁重建 */}
              <div className="editor-pane" style={{ display: viewMode === 'preview' ? 'none' : undefined }}>
                <Editor />
              </div>

              {/* 分屏分割线（仅实时预览模式显示） */}
              {viewMode === 'live' && <div className="split-divider" />}

              {/* 预览面板（实时预览 + 纯预览模式显示） */}
              {(viewMode === 'live' || viewMode === 'preview') && (
                <div className="preview-pane">
                  <Preview />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 状态栏 */}
      <StatusBar />

      {/* 弹窗 */}
      <QuickOpen
        visible={quickOpenVisible}
        onClose={() => useEditorStore.getState().setQuickOpenVisible(false)}
      />
      <GlobalSearch
        visible={globalSearchVisible}
        onClose={() => useEditorStore.getState().setGlobalSearchVisible(false)}
      />
      <VersionHistory
        visible={versionHistoryVisible}
        onClose={() => useEditorStore.getState().setVersionHistoryVisible(false)}
      />
    </div>
  )
}

export default App