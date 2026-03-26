import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { EditorView } from '@codemirror/view'
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
} from '../../editor/commands/markdownCommands'
import { useFileStore } from '../../stores/fileStore'
import {
  IconClipboard,
  IconEdit,
  IconBold,
  IconItalic,
  IconUnderline,
  IconStrikethrough,
  IconInlineCode,
  IconMath,
  IconHighlight,
  IconH1,
  IconH2,
  IconH3,
  IconList,
  IconOrderedList,
  IconLink,
  IconImage,
  IconTable,
  IconCodeBlock,
  IconQuote,
  IconHorizontalRule,
  IconTaskList,
  IconFileImport,
  IconSparkles,
  IconRefresh,
  IconTrash,
  IconCopy,
  IconPaste,
} from '../Icons'

interface MenuPosition {
  x: number
  y: number
}

interface MenuItem {
  icon?: React.ReactNode
  label: string
  shortcut?: string
  action?: (view: EditorView) => void
  divider?: boolean
  children?: MenuItem[]
}

interface ContextMenuProps {
  editorView: EditorView | null
}

/**
 * 编辑器右键上下文菜单组件 —— Apple HIG 风格
 * SVG 图标，圆角菜单，hover 高亮为 accent 色
 */
function ContextMenu({ editorView }: ContextMenuProps) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<MenuPosition>({ x: 0, y: 0 })
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const submenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { openFile, saveCurrentFile, currentFile } = useFileStore()

  // 构建菜单项
  const menuItems: MenuItem[] = useMemo(() => [
    {
      icon: <IconClipboard size={14} />,
      label: '插入',
      children: [
        { icon: <IconLink size={14} />, label: '链接', shortcut: 'Ctrl K', action: (v) => insertLink(v) },
        { icon: <IconImage size={14} />, label: '图片', shortcut: 'Ctrl Shift I', action: (v) => insertImage(v) },
        { icon: <IconTable size={14} />, label: '表格', shortcut: 'Ctrl T', action: (v) => insertTable(v) },
        { icon: <IconCodeBlock size={14} />, label: '代码块', shortcut: 'Ctrl Shift K', action: (v) => insertCodeBlock(v) },
        { icon: <IconMath size={14} />, label: '公式块', shortcut: 'Ctrl Shift M', action: (v) => insertMathBlock(v) },
        { icon: <IconQuote size={14} />, label: '引用', shortcut: 'Ctrl Shift Q', action: (v) => toggleBlockquote(v) },
        { icon: <IconHorizontalRule size={14} />, label: '水平线', action: (v) => insertHorizontalRule(v) },
        { icon: <IconTaskList size={14} />, label: '任务列表', action: (v) => toggleTaskList(v) },
      ],
    },
    {
      icon: <IconEdit size={14} />,
      label: '文本格式',
      children: [
        { icon: <IconBold size={14} />, label: '加粗', shortcut: 'Ctrl B', action: (v) => toggleBold(v) },
        { icon: <IconItalic size={14} />, label: '斜体', shortcut: 'Ctrl I', action: (v) => toggleItalic(v) },
        { icon: <IconUnderline size={14} />, label: '下划线', shortcut: 'Ctrl U', action: (v) => toggleUnderline(v) },
        { icon: <IconStrikethrough size={14} />, label: '删除线', shortcut: 'Alt Shift 5', action: (v) => toggleStrikethrough(v) },
        { icon: <IconInlineCode size={14} />, label: '行内代码', shortcut: "Ctrl Shift `", action: (v) => toggleInlineCode(v) },
        { icon: <IconMath size={14} />, label: '行内公式', action: (v) => toggleInlineMath(v) },
        { icon: <IconHighlight size={14} />, label: '高亮', action: (v) => toggleHighlight(v) },
      ],
    },
    {
      icon: <IconH1 size={14} />,
      label: '标题',
      children: [
        { icon: <IconH1 size={14} />, label: '标题 1', shortcut: 'Ctrl 1', action: (v) => setHeading(v, 1) },
        { icon: <IconH2 size={14} />, label: '标题 2', shortcut: 'Ctrl 2', action: (v) => setHeading(v, 2) },
        { icon: <IconH3 size={14} />, label: '标题 3', shortcut: 'Ctrl 3', action: (v) => setHeading(v, 3) },
        { icon: <IconH1 size={14} />, label: '标题 4', shortcut: 'Ctrl 4', action: (v) => setHeading(v, 4) },
        { icon: <IconH1 size={14} />, label: '标题 5', shortcut: 'Ctrl 5', action: (v) => setHeading(v, 5) },
        { icon: <IconH1 size={14} />, label: '标题 6', shortcut: 'Ctrl 6', action: (v) => setHeading(v, 6) },
      ],
    },
    {
      icon: <IconList size={14} />,
      label: '无序列表',
      shortcut: 'Ctrl Shift ]',
      action: (v) => toggleUnorderedList(v),
    },
    {
      icon: <IconOrderedList size={14} />,
      label: '有序列表',
      shortcut: 'Ctrl Shift [',
      action: (v) => toggleOrderedList(v),
    },
    { divider: true, label: '' },
    {
      icon: <IconFileImport size={14} />,
      label: '导入 .md 文档',
      action: () => { openFile() },
    },
    { divider: true, label: '' },
    {
      icon: <IconSparkles size={14} />,
      label: '格式化',
      shortcut: 'Alt Shift F',
      action: (v) => formatDocument(v),
    },
    { divider: true, label: '' },
    {
      icon: <IconRefresh size={14} />,
      label: '重置文档',
      action: () => {
        if (currentFile.filePath) {
          useFileStore.getState().openFileByPath(currentFile.filePath)
        }
      },
    },
    {
      icon: <IconTrash size={14} />,
      label: '清空内容',
      action: (v) => clearContent(v),
    },
    { divider: true, label: '' },
    {
      icon: <IconCopy size={14} />,
      label: '复制',
      shortcut: 'Ctrl C',
      action: () => { document.execCommand('copy') },
    },
    {
      icon: <IconPaste size={14} />,
      label: '粘贴',
      shortcut: 'Ctrl V',
      action: () => { document.execCommand('paste') },
    },
  ], [openFile, currentFile.filePath])

  // 显示菜单
  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const x = Math.min(e.clientX, window.innerWidth - 260)
    const y = Math.min(e.clientY, window.innerHeight - 400)

    setPosition({ x, y })
    setVisible(true)
    setActiveSubmenu(null)
  }, [])

  // 隐藏菜单
  const handleClose = useCallback(() => {
    setVisible(false)
    setActiveSubmenu(null)
  }, [])

  // 点击菜单项
  const handleItemClick = useCallback((item: MenuItem) => {
    if (item.children) return
    if (item.divider) return

    handleClose()

    if (item.action && editorView) {
      setTimeout(() => {
        item.action!(editorView)
      }, 10)
    }
  }, [editorView, handleClose])

  // 监听右键事件
  useEffect(() => {
    const editorWrapper = document.querySelector('.editor-wrapper')
    if (!editorWrapper) return

    editorWrapper.addEventListener('contextmenu', handleContextMenu as EventListener)

    return () => {
      editorWrapper.removeEventListener('contextmenu', handleContextMenu as EventListener)
    }
  }, [handleContextMenu])

  // 点击外部关闭
  useEffect(() => {
    if (!visible) return

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('scroll', handleClose, true)

    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('scroll', handleClose, true)
    }
  }, [visible, handleClose])

  // 子菜单延迟显示/隐藏
  const handleSubmenuEnter = useCallback((label: string) => {
    if (submenuTimerRef.current) {
      clearTimeout(submenuTimerRef.current)
      submenuTimerRef.current = null
    }
    setActiveSubmenu(label)
  }, [])

  const handleSubmenuLeave = useCallback(() => {
    submenuTimerRef.current = setTimeout(() => {
      setActiveSubmenu(null)
    }, 200)
  }, [])

  if (!visible) return null

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: position.x, top: position.y }}
    >
      {menuItems.map((item, index) => {
        if (item.divider) {
          return <div key={`divider-${index}`} className="context-menu-divider" />
        }

        const hasChildren = !!item.children

        return (
          <div
            key={item.label}
            className={`context-menu-item ${hasChildren && activeSubmenu === item.label ? 'active' : ''}`}
            onClick={() => handleItemClick(item)}
            onMouseEnter={() => hasChildren ? handleSubmenuEnter(item.label) : setActiveSubmenu(null)}
            onMouseLeave={() => hasChildren ? handleSubmenuLeave() : undefined}
          >
            <span className="context-menu-icon">{item.icon}</span>
            <span className="context-menu-label">{item.label}</span>
            {item.shortcut && (
              <span className="context-menu-shortcut">{item.shortcut}</span>
            )}
            {hasChildren && (
              <span className="context-menu-arrow">▸</span>
            )}

            {/* 子菜单 */}
            {hasChildren && activeSubmenu === item.label && (
              <div
                className="context-submenu"
                onMouseEnter={() => handleSubmenuEnter(item.label)}
                onMouseLeave={handleSubmenuLeave}
              >
                {item.children!.map((child) => (
                  <div
                    key={child.label}
                    className="context-menu-item"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleItemClick(child)
                    }}
                  >
                    <span className="context-menu-icon">{child.icon}</span>
                    <span className="context-menu-label">{child.label}</span>
                    {child.shortcut && (
                      <span className="context-menu-shortcut">{child.shortcut}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default ContextMenu
