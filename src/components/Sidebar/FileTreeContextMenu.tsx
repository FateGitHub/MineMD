import { useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useFileStore } from '../../stores/fileStore'
import {
  IconFilePlus,
  IconFolderPlus,
  IconExternalLink,
  IconEdit,
  IconTrash,
  IconFolderSearch,
} from '../Icons'
import type { FileEntry } from '../../types/index'

interface MenuPosition {
  x: number
  y: number
}

interface FileTreeContextMenuProps {
  /** 右键点击的文件条目 */
  targetEntry: FileEntry | null
  /** 菜单位置 */
  position: MenuPosition
  /** 是否可见 */
  visible: boolean
  /** 关闭菜单 */
  onClose: () => void
  /** 触发重命名 */
  onRename: (entry: FileEntry) => void
  /** 触发新建文件（在指定目录下） */
  onCreateFile: (dirPath: string) => void
  /** 触发新建文件夹（在指定目录下） */
  onCreateFolder: (dirPath: string) => void
}

/**
 * 获取条目所在的父目录路径
 * 如果条目是文件夹，返回其自身路径；如果是文件，返回其父目录路径
 */
function getParentDir(entry: FileEntry): string {
  if (entry.isDirectory) {
    return entry.path
  }
  const sep = entry.path.includes('/') ? '/' : '\\'
  const lastSepIndex = entry.path.lastIndexOf(sep)
  return lastSepIndex > 0 ? entry.path.substring(0, lastSepIndex) : entry.path
}

/**
 * 文件树右键上下文菜单
 * 支持：新建文件、新建文件夹、在新窗口打开、重命名、删除、打开文件源位置
 */
function FileTreeContextMenu({
  targetEntry,
  position,
  visible,
  onClose,
  onRename,
  onCreateFile,
  onCreateFolder,
}: FileTreeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const { deleteFileByPath } = useFileStore()

  // 新建文件
  const handleCreateFile = useCallback(() => {
    if (!targetEntry) return
    onClose()
    const dir = getParentDir(targetEntry)
    setTimeout(() => onCreateFile(dir), 50)
  }, [targetEntry, onClose, onCreateFile])

  // 新建文件夹
  const handleCreateFolder = useCallback(() => {
    if (!targetEntry) return
    onClose()
    const dir = getParentDir(targetEntry)
    setTimeout(() => onCreateFolder(dir), 50)
  }, [targetEntry, onClose, onCreateFolder])

  // 在新窗口打开
  const handleOpenInNewWindow = useCallback(() => {
    if (!targetEntry || targetEntry.isDirectory) return
    onClose()
    window.electronAPI.openInNewWindow(targetEntry.path)
  }, [targetEntry, onClose])

  // 重命名
  const handleRename = useCallback(() => {
    if (!targetEntry) return
    onClose()
    setTimeout(() => onRename(targetEntry), 50)
  }, [targetEntry, onClose, onRename])

  // 删除
  const handleDelete = useCallback(() => {
    if (!targetEntry) return
    onClose()
    deleteFileByPath(targetEntry.path)
  }, [targetEntry, onClose, deleteFileByPath])

  // 在文件管理器中显示
  const handleShowInFolder = useCallback(() => {
    if (!targetEntry) return
    onClose()
    window.electronAPI.showItemInFolder(targetEntry.path)
  }, [targetEntry, onClose])

  // 点击外部关闭
  useEffect(() => {
    if (!visible) return

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('scroll', onClose, true)

    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('scroll', onClose, true)
    }
  }, [visible, onClose])

  if (!visible || !targetEntry) return null

  // 菜单项配置
  const isFile = !targetEntry.isDirectory
  const menuItems = [
    {
      icon: <IconFilePlus size={14} />,
      label: '新建文件',
      action: handleCreateFile,
    },
    {
      icon: <IconFolderPlus size={14} />,
      label: '新建文件夹',
      action: handleCreateFolder,
    },
    { divider: true },
    ...(isFile
      ? [
          {
            icon: <IconExternalLink size={14} />,
            label: '在新窗口打开',
            action: handleOpenInNewWindow,
          },
        ]
      : []),
    {
      icon: <IconEdit size={14} />,
      label: '重命名',
      action: handleRename,
    },
    {
      icon: <IconTrash size={14} />,
      label: '删除',
      action: handleDelete,
      danger: true,
    },
    { divider: true },
    {
      icon: <IconFolderSearch size={14} />,
      label: '打开文件源位置',
      action: handleShowInFolder,
    },
  ]

  return createPortal(
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: position.x, top: position.y }}
    >
      {menuItems.map((item, index) => {
        if ('divider' in item && item.divider) {
          return <div key={`divider-${index}`} className="context-menu-divider" />
        }

        const menuItem = item as {
          icon: React.ReactNode
          label: string
          action: () => void
          danger?: boolean
        }

        return (
          <div
            key={menuItem.label}
            className={`context-menu-item ${menuItem.danger ? 'danger' : ''}`}
            onClick={menuItem.action}
          >
            <span className="context-menu-icon">{menuItem.icon}</span>
            <span className="context-menu-label">{menuItem.label}</span>
          </div>
        )
      })}
    </div>,
    document.body,
  )
}

export default FileTreeContextMenu
