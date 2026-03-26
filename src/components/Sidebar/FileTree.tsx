import { useState, useCallback, useRef, useEffect } from 'react'
import { useFileStore } from '../../stores/fileStore'
import { IconFolder, IconFile, IconChevronRight } from '../Icons'
import FileTreeContextMenu from './FileTreeContextMenu'
import type { FileEntry } from '../../types/index'

/** 右键菜单状态 */
interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  entry: FileEntry | null
}

/** 新建条目的状态 */
interface NewItemState {
  /** 新建条目所在的目录路径 */
  dirPath: string
  /** 类型：file 或 folder */
  type: 'file' | 'folder'
}

/**
 * 文件树组件 —— Apple HIG 风格
 * SVG 图标，圆角 hover 效果，支持右键菜单、内联重命名、新建文件/文件夹
 */
function FileTree() {
  const { fileTree, openFileByPath, currentFile, renameFileByPath, createFileInDir, createFolderInDir } = useFileStore()

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    entry: null,
  })

  // 正在重命名的文件路径
  const [renamingPath, setRenamingPath] = useState<string | null>(null)

  // 新建文件/文件夹状态
  const [newItem, setNewItem] = useState<NewItemState | null>(null)

  // 需要自动展开的目录路径集合
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())

  // 关闭右键菜单
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }, [])

  // 右键点击文件/文件夹
  const handleContextMenu = useCallback((e: React.MouseEvent, entry: FileEntry) => {
    e.preventDefault()
    e.stopPropagation()

    // 获取被点击的文件行元素位置，使菜单 Y 坐标与文件行平行
    const target = (e.currentTarget as HTMLElement)
    const rect = target.getBoundingClientRect()

    // 菜单宽高预估
    const menuWidth = 240
    const menuHeight = 280

    // X 坐标：使用鼠标点击位置，确保不超出右侧
    let x = e.clientX
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 8
    }
    x = Math.max(4, x)

    // Y 坐标：与文件行顶部对齐；如果超出底部则往上调整
    let y = rect.top
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 8
    }
    y = Math.max(4, y)

    setContextMenu({ visible: true, x, y, entry })
  }, [])

  // 触发重命名
  const handleStartRename = useCallback((entry: FileEntry) => {
    setRenamingPath(entry.path)
  }, [])

  // 完成重命名
  const handleFinishRename = useCallback(
    (oldPath: string, newName: string) => {
      setRenamingPath(null)
      if (newName.trim()) {
        renameFileByPath(oldPath, newName.trim())
      }
    },
    [renameFileByPath],
  )

  // 取消重命名
  const handleCancelRename = useCallback(() => {
    setRenamingPath(null)
  }, [])

  // 触发新建文件
  const handleCreateFile = useCallback((dirPath: string) => {
    // 自动展开目标目录
    setExpandedPaths((prev) => new Set(prev).add(dirPath))
    setNewItem({ dirPath, type: 'file' })
  }, [])

  // 触发新建文件夹
  const handleCreateFolder = useCallback((dirPath: string) => {
    // 自动展开目标目录
    setExpandedPaths((prev) => new Set(prev).add(dirPath))
    setNewItem({ dirPath, type: 'folder' })
  }, [])

  // 完成新建
  const handleFinishNewItem = useCallback(
    (name: string) => {
      if (!newItem || !name.trim()) {
        setNewItem(null)
        return
      }
      if (newItem.type === 'file') {
        createFileInDir(newItem.dirPath, name.trim())
      } else {
        createFolderInDir(newItem.dirPath, name.trim())
      }
      setNewItem(null)
    },
    [newItem, createFileInDir, createFolderInDir],
  )

  // 取消新建
  const handleCancelNewItem = useCallback(() => {
    setNewItem(null)
  }, [])

  return (
    <div style={{ padding: '4px 0' }}>
      {fileTree.map((entry) => (
        <FileTreeNode
          key={entry.path}
          entry={entry}
          depth={0}
          currentFilePath={currentFile.filePath}
          onFileClick={openFileByPath}
          onContextMenu={handleContextMenu}
          renamingPath={renamingPath}
          onFinishRename={handleFinishRename}
          onCancelRename={handleCancelRename}
          newItem={newItem}
          onFinishNewItem={handleFinishNewItem}
          onCancelNewItem={handleCancelNewItem}
          expandedPaths={expandedPaths}
          setExpandedPaths={setExpandedPaths}
        />
      ))}

      {/* 文件树右键菜单 */}
      <FileTreeContextMenu
        targetEntry={contextMenu.entry}
        position={{ x: contextMenu.x, y: contextMenu.y }}
        visible={contextMenu.visible}
        onClose={handleCloseContextMenu}
        onRename={handleStartRename}
        onCreateFile={handleCreateFile}
        onCreateFolder={handleCreateFolder}
      />
    </div>
  )
}

interface FileTreeNodeProps {
  entry: FileEntry
  depth: number
  currentFilePath: string | null
  onFileClick: (path: string) => void
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void
  renamingPath: string | null
  onFinishRename: (oldPath: string, newName: string) => void
  onCancelRename: () => void
  newItem: NewItemState | null
  onFinishNewItem: (name: string) => void
  onCancelNewItem: () => void
  expandedPaths: Set<string>
  setExpandedPaths: React.Dispatch<React.SetStateAction<Set<string>>>
}

function FileTreeNode({
  entry,
  depth,
  currentFilePath,
  onFileClick,
  onContextMenu,
  renamingPath,
  onFinishRename,
  onCancelRename,
  newItem,
  onFinishNewItem,
  onCancelNewItem,
  expandedPaths,
  setExpandedPaths,
}: FileTreeNodeProps) {
  const [localExpanded, setLocalExpanded] = useState(depth < 1)
  const isActive = !entry.isDirectory && entry.path === currentFilePath
  const paddingLeft = 8 + depth * 16
  const isRenaming = renamingPath === entry.path

  // 如果 expandedPaths 包含当前目录，则强制展开
  const isForceExpanded = entry.isDirectory && expandedPaths.has(entry.path)
  const expanded = localExpanded || isForceExpanded

  const toggleExpand = useCallback(() => {
    const next = !expanded
    setLocalExpanded(next)
    // 如果手动折叠，也从强制展开集合中移除
    if (!next && isForceExpanded) {
      setExpandedPaths((prev) => {
        const s = new Set(prev)
        s.delete(entry.path)
        return s
      })
    }
  }, [expanded, isForceExpanded, entry.path, setExpandedPaths])

  // 判断新建条目是否属于当前目录
  const showNewItemInput = newItem && entry.isDirectory && newItem.dirPath === entry.path

  if (entry.isDirectory) {
    return (
      <div>
        <div
          className="file-tree-item"
          style={{ paddingLeft }}
          onClick={toggleExpand}
          onContextMenu={(e) => onContextMenu(e, entry)}
        >
          <span className={`arrow ${expanded ? 'expanded' : ''}`}>
            <IconChevronRight size={12} />
          </span>
          <span className="icon">
            <IconFolder size={14} />
          </span>
          {isRenaming ? (
            <InlineRenameInput
              defaultName={entry.name}
              onFinish={(newName) => onFinishRename(entry.path, newName)}
              onCancel={onCancelRename}
            />
          ) : (
            <span className="name">{entry.name}</span>
          )}
        </div>
        {expanded && (
          <>
            {/* 新建条目的内联输入行（显示在子文件列表顶部） */}
            {showNewItemInput && (
              <NewItemInput
                type={newItem.type}
                depth={depth + 1}
                onFinish={onFinishNewItem}
                onCancel={onCancelNewItem}
              />
            )}
            {entry.children?.map((child) => (
              <FileTreeNode
                key={child.path}
                entry={child}
                depth={depth + 1}
                currentFilePath={currentFilePath}
                onFileClick={onFileClick}
                onContextMenu={onContextMenu}
                renamingPath={renamingPath}
                onFinishRename={onFinishRename}
                onCancelRename={onCancelRename}
                newItem={newItem}
                onFinishNewItem={onFinishNewItem}
                onCancelNewItem={onCancelNewItem}
                expandedPaths={expandedPaths}
                setExpandedPaths={setExpandedPaths}
              />
            ))}
          </>
        )}
      </div>
    )
  }

  return (
    <div
      className={`file-tree-item ${isActive ? 'active' : ''}`}
      style={{ paddingLeft: paddingLeft + 16 }}
      onClick={() => !isRenaming && onFileClick(entry.path)}
      onContextMenu={(e) => onContextMenu(e, entry)}
    >
      <span className="icon" style={{ opacity: 0.5 }}>
        <IconFile size={14} />
      </span>
      {isRenaming ? (
        <InlineRenameInput
          defaultName={entry.name}
          onFinish={(newName) => onFinishRename(entry.path, newName)}
          onCancel={onCancelRename}
        />
      ) : (
        <span className="name">{entry.name}</span>
      )}
    </div>
  )
}

/** 内联重命名输入框 */
interface InlineRenameInputProps {
  defaultName: string
  onFinish: (newName: string) => void
  onCancel: () => void
}

function InlineRenameInput({ defaultName, onFinish, onCancel }: InlineRenameInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(defaultName)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      // 选中文件名（不含扩展名）
      const dotIndex = defaultName.lastIndexOf('.')
      if (dotIndex > 0) {
        inputRef.current.setSelectionRange(0, dotIndex)
      } else {
        inputRef.current.select()
      }
    }
  }, [defaultName])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      onFinish(value)
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <input
      ref={inputRef}
      className="file-tree-rename-input"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onFinish(value)}
      onClick={(e) => e.stopPropagation()}
    />
  )
}

/** 新建文件/文件夹的内联输入行 */
interface NewItemInputProps {
  type: 'file' | 'folder'
  depth: number
  onFinish: (name: string) => void
  onCancel: () => void
}

function NewItemInput({ type, depth, onFinish, onCancel }: NewItemInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')
  const paddingLeft = type === 'folder' ? 8 + depth * 16 : 8 + depth * 16 + 16

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      if (value.trim()) {
        onFinish(value)
      } else {
        onCancel()
      }
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  const handleBlur = () => {
    if (value.trim()) {
      onFinish(value)
    } else {
      onCancel()
    }
  }

  return (
    <div className="file-tree-item" style={{ paddingLeft }}>
      {type === 'folder' && (
        <span className="arrow">
          <IconChevronRight size={12} />
        </span>
      )}
      <span className="icon" style={{ opacity: type === 'file' ? 0.5 : 1 }}>
        {type === 'file' ? <IconFile size={14} /> : <IconFolder size={14} />}
      </span>
      <input
        ref={inputRef}
        className="file-tree-rename-input"
        value={value}
        placeholder={type === 'file' ? '文件名...' : '文件夹名...'}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

export default FileTree
