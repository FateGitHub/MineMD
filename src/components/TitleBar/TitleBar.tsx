import { useFileStore } from '../../stores/fileStore'
import { useEditorStore } from '../../stores/editorStore'
import { IconSidebar } from '../Icons'

/**
 * 标题栏组件 —— Apple HIG 风格
 * 文件名居中，侧边栏切换 SVG 图标
 */
function TitleBar() {
  const { currentFile } = useFileStore()
  const { toggleSidebar, sidebarVisible } = useEditorStore()

  return (
    <div className="titlebar">
      {/* 侧边栏切换按钮 */}
      <button
        className="titlebar-no-drag"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 6px',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--editor-text-secondary)',
          opacity: sidebarVisible ? 0.8 : 0.4,
          transition: 'opacity 0.15s, background 0.15s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={toggleSidebar}
        title="切换侧边栏"
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--editor-hover)'; e.currentTarget.style.opacity = '1' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.opacity = sidebarVisible ? '0.8' : '0.4' }}
      >
        <IconSidebar size={15} />
      </button>

      {/* 文件名 */}
      <div className="file-name" style={{ flex: 1, textAlign: 'center' }}>
        <span>{currentFile.fileName}</span>
        {currentFile.isModified && <span className="modified-dot">●</span>}
      </div>

      {/* 占位，保持居中 */}
      <div style={{ width: 32 }} />
    </div>
  )
}

export default TitleBar
