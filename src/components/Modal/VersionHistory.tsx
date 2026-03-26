import { useState, useMemo } from 'react'
import { useVersionStore, type VersionSnapshot } from '../../stores/versionStore'
import { useFileStore } from '../../stores/fileStore'

interface VersionHistoryProps {
  visible: boolean
  onClose: () => void
}

/**
 * 版本历史弹窗
 * 显示当前文件的历史版本列表，支持查看和恢复
 */
function VersionHistory({ visible, onClose }: VersionHistoryProps) {
  const { currentFile, updateContent } = useFileStore()
  const { getVersions } = useVersionStore()
  const [previewVersion, setPreviewVersion] = useState<VersionSnapshot | null>(null)

  const versions = useMemo(() => {
    if (!currentFile.filePath) return []
    return [...getVersions(currentFile.filePath)].reverse()
  }, [currentFile.filePath, getVersions, visible])

  const handleRestore = (version: VersionSnapshot) => {
    updateContent(version.content)
    setPreviewVersion(null)
    onClose()
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - timestamp

    if (diffMs < 60000) return '刚刚'
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)} 分钟前`
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)} 小时前`

    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!visible) return null

  return (
    <div className="quick-open-overlay" onClick={onClose}>
      <div
        className="quick-open-panel"
        style={{ width: previewVersion ? 800 : 400 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="version-header">
          <h3>版本历史</h3>
          <span className="version-file-name">{currentFile.fileName}</span>
        </div>

        <div style={{ display: 'flex', height: '400px' }}>
          {/* 版本列表 */}
          <div className="version-list">
            {versions.length === 0 ? (
              <div className="quick-open-empty">暂无版本记录</div>
            ) : (
              versions.map((v) => (
                <div
                  key={v.id}
                  className={`version-item ${previewVersion?.id === v.id ? 'selected' : ''}`}
                  onClick={() => setPreviewVersion(v)}
                >
                  <div className="version-time">{formatTime(v.timestamp)}</div>
                  <div className="version-size">
                    {v.content.length} 字符
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 预览面板 */}
          {previewVersion && (
            <div className="version-preview">
              <div className="version-preview-header">
                <span>{formatTime(previewVersion.timestamp)}</span>
                <button
                  className="version-restore-btn"
                  onClick={() => handleRestore(previewVersion)}
                >
                  恢复此版本
                </button>
              </div>
              <pre className="version-preview-content">{previewVersion.content}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VersionHistory
