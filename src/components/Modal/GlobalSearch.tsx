import { useState, useEffect, useRef, useCallback } from 'react'
import { useFileStore } from '../../stores/fileStore'
import { IconFile } from '../Icons'

interface SearchResult {
  filePath: string
  fileName: string
  lineNumber: number
  lineText: string
  matchStart: number
  matchEnd: number
}

interface GlobalSearchProps {
  visible: boolean
  onClose: () => void
}

/**
 * 全局搜索面板 —— Typora 风格 (Ctrl+Shift+F)
 * 在当前文件夹中搜索内容
 */
function GlobalSearch({ visible, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { folderPath, fileTree, openFileByPath } = useFileStore()

  useEffect(() => {
    if (visible) {
      setQuery('')
      setResults([])
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [visible])

  // 递归收集所有文件路径
  const collectFiles = useCallback((entries: any[]): string[] => {
    const paths: string[] = []
    for (const entry of entries) {
      if (entry.isDirectory && entry.children) {
        paths.push(...collectFiles(entry.children))
      } else if (!entry.isDirectory) {
        paths.push(entry.path)
      }
    }
    return paths
  }, [])

  // 执行搜索
  const doSearch = useCallback(async () => {
    if (!query.trim() || !folderPath) return

    setSearching(true)
    const filePaths = collectFiles(fileTree)
    const found: SearchResult[] = []
    const lowerQuery = query.toLowerCase()
    /** 每个文件的匹配计数，避免在内层循环中反复 filter */
    const fileMatchCount = new Map<string, number>()

    for (const filePath of filePaths) {
      try {
        const content = await window.electronAPI.readFile(filePath)
        const lines = content.split('\n')
        const fileName = filePath.split(/[\\/]/).pop() || ''
        let currentFileCount = 0

        for (let i = 0; i < lines.length; i++) {
          const lowerLine = lines[i].toLowerCase()
          let searchFrom = 0
          while (true) {
            const idx = lowerLine.indexOf(lowerQuery, searchFrom)
            if (idx === -1) break
            found.push({
              filePath,
              fileName,
              lineNumber: i + 1,
              lineText: lines[i],
              matchStart: idx,
              matchEnd: idx + query.length,
            })
            currentFileCount++
            searchFrom = idx + 1
            // 每个文件最多展示 10 条匹配
            if (currentFileCount >= 10) break
          }
          if (currentFileCount >= 10) break
        }
        fileMatchCount.set(filePath, currentFileCount)
      } catch {
        // 跳过无法读取的文件
      }

      // 最多 100 条结果
      if (found.length >= 100) break
    }

    setResults(found)
    setSearching(false)
  }, [query, folderPath, fileTree, collectFiles])

  // 回车搜索
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        doSearch()
      }
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [doSearch, onClose],
  )

  // 点击结果跳转
  const handleResultClick = useCallback(
    (result: SearchResult) => {
      openFileByPath(result.filePath)
      onClose()
    },
    [openFileByPath, onClose],
  )

  if (!visible) return null

  // 按文件分组
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.filePath]) acc[r.filePath] = []
    acc[r.filePath].push(r)
    return acc
  }, {})

  return (
    <div className="quick-open-overlay" onClick={onClose}>
      <div className="quick-open-panel global-search-panel" onClick={(e) => e.stopPropagation()}>
        <div className="global-search-header">
          <input
            ref={inputRef}
            type="text"
            className="quick-open-input"
            placeholder={folderPath ? '在文件夹中搜索...' : '请先打开一个文件夹'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="global-search-btn" onClick={doSearch} disabled={searching}>
            {searching ? '搜索中...' : '搜索'}
          </button>
        </div>

        <div className="quick-open-list" style={{ maxHeight: '400px' }}>
          {results.length === 0 && !searching ? (
            <div className="quick-open-empty">
              {query.trim() ? '无搜索结果' : '输入关键词后按回车搜索'}
            </div>
          ) : (
            Object.entries(grouped).map(([filePath, items]) => (
              <div key={filePath} className="search-file-group">
                <div className="search-file-name">
                  <IconFile size={13} /> {items[0].fileName}
                  <span className="search-count">{items.length}</span>
                </div>
                {items.map((item, idx) => (
                  <div
                    key={`${item.lineNumber}-${idx}`}
                    className="search-result-item"
                    onClick={() => handleResultClick(item)}
                  >
                    <span className="search-line-no">{item.lineNumber}</span>
                    <span className="search-line-text">
                      {item.lineText.substring(0, item.matchStart)}
                      <mark>{item.lineText.substring(item.matchStart, item.matchEnd)}</mark>
                      {item.lineText.substring(item.matchEnd)}
                    </span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default GlobalSearch
