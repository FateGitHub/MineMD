import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useFileStore } from '../../stores/fileStore'
import { IconFile } from '../Icons'

interface QuickOpenProps {
  visible: boolean
  onClose: () => void
}

interface FlatFile {
  name: string
  path: string
  relativePath: string
}

/**
 * 快速打开弹窗 —— Typora 风格 (Ctrl+P)
 * 模糊搜索当前文件夹中的文件
 */
function QuickOpen({ visible, onClose }: QuickOpenProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { fileTree, openFileByPath, folderPath } = useFileStore()

  // 将文件树扁平化
  const flatFiles = useMemo(() => {
    const files: FlatFile[] = []
    function flatten(entries: any[], parentPath: string) {
      for (const entry of entries) {
        if (entry.isDirectory && entry.children) {
          flatten(entry.children, parentPath ? `${parentPath}/${entry.name}` : entry.name)
        } else if (!entry.isDirectory) {
          files.push({
            name: entry.name,
            path: entry.path,
            relativePath: parentPath ? `${parentPath}/${entry.name}` : entry.name,
          })
        }
      }
    }
    flatten(fileTree, '')
    return files
  }, [fileTree])

  // 模糊搜索过滤
  const filtered = useMemo(() => {
    if (!query.trim()) return flatFiles
    const lowerQuery = query.toLowerCase()
    return flatFiles.filter(
      (f) =>
        f.name.toLowerCase().includes(lowerQuery) ||
        f.relativePath.toLowerCase().includes(lowerQuery),
    ).sort((a, b) => {
      // 名称匹配优先
      const aNameMatch = a.name.toLowerCase().indexOf(lowerQuery)
      const bNameMatch = b.name.toLowerCase().indexOf(lowerQuery)
      if (aNameMatch !== -1 && bNameMatch === -1) return -1
      if (aNameMatch === -1 && bNameMatch !== -1) return 1
      return a.name.localeCompare(b.name)
    })
  }, [flatFiles, query])

  // 打开时聚焦
  useEffect(() => {
    if (visible) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [visible])

  // 确保选中项在范围内
  useEffect(() => {
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(Math.max(0, filtered.length - 1))
    }
  }, [filtered, selectedIndex])

  const handleSelect = useCallback(
    (file: FlatFile) => {
      openFileByPath(file.path)
      onClose()
    },
    [openFileByPath, onClose],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (filtered[selectedIndex]) {
            handleSelect(filtered[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    },
    [filtered, selectedIndex, handleSelect, onClose],
  )

  if (!visible) return null

  return (
    <div className="quick-open-overlay" onClick={onClose}>
      <div className="quick-open-panel" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          className="quick-open-input"
          placeholder={folderPath ? '输入文件名搜索...' : '请先打开一个文件夹'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelectedIndex(0)
          }}
          onKeyDown={handleKeyDown}
        />

        <div className="quick-open-list">
          {filtered.length === 0 ? (
            <div className="quick-open-empty">
              {folderPath ? '无匹配文件' : '请先打开一个文件夹'}
            </div>
          ) : (
            filtered.slice(0, 20).map((file, index) => (
              <div
                key={file.path}
                className={`quick-open-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSelect(file)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="quick-open-icon"><IconFile size={14} /></span>
                <span className="quick-open-name">{file.name}</span>
                <span className="quick-open-path">{file.relativePath}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default QuickOpen
