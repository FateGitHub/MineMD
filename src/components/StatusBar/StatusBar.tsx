import { useEditorStore } from '../../stores/editorStore'
import { useFileStore } from '../../stores/fileStore'
import { useThemeStore } from '../../stores/themeStore'
import { IconSun, IconMoon } from '../Icons'

/**
 * 状态栏组件 —— Typora 风格
 * 底部极简信息栏：字数统计 / 选区统计 / 视图模式 / 主题切换
 */
function StatusBar() {
  const { wordCount, selectionWordCount, viewMode, setViewMode, zoomLevel } = useEditorStore()
  const { currentFile } = useFileStore()
  const { theme, toggleTheme } = useThemeStore()

  return (
    <div className="statusbar">
      {/* 左侧信息 */}
      <div className="status-left">
        {/* 字数统计 */}
        <span className="status-item" title="字符数 / 单词数">
          {wordCount.words} 词 · {wordCount.characters} 字符
        </span>

        <span className="status-divider" />

        {/* 行/段落 */}
        <span className="status-item">
          {wordCount.lines} 行 · {wordCount.paragraphs} 段
        </span>

        {/* 选区统计 */}
        {selectionWordCount && (
          <>
            <span className="status-divider" />
            <span className="status-item" style={{ color: 'var(--editor-link-color)' }}>
              选中 {selectionWordCount.words} 词 / {selectionWordCount.characters} 字符
            </span>
          </>
        )}

        {currentFile.isModified && (
          <>
            <span className="status-divider" />
            <span className="status-item" style={{ color: '#e67e22' }}>已修改</span>
          </>
        )}
      </div>

      {/* 右侧操作 */}
      <div className="status-right">
        {/* 缩放 */}
        {zoomLevel !== 100 && (
          <span className="status-item">{zoomLevel}%</span>
        )}

        {/* 视图模式切换 —— 四模式循环 */}
        <span
          className="status-item clickable"
          onClick={() => {
            const modes = ['source', 'wysiwyg', 'live', 'preview'] as const
            const idx = modes.indexOf(viewMode as typeof modes[number])
            const next = modes[(idx + 1) % modes.length]
            setViewMode(next)
          }}
          title="切换视图模式（源码 → 即时渲染 → 实时预览 → 纯预览）"
        >
          {viewMode === 'source' ? '源码' : viewMode === 'wysiwyg' ? '即时渲染' : viewMode === 'live' ? '实时预览' : '预览'}
        </span>

        <span className="status-divider" />

        {/* 主题切换 */}
        <span
          className="status-item clickable"
          onClick={toggleTheme}
          title={theme === 'light' ? '切换暗色主题' : '切换亮色主题'}
        >
          {theme === 'light' ? <IconSun size={12} /> : <IconMoon size={12} />}
        </span>
      </div>
    </div>
  )
}

export default StatusBar
