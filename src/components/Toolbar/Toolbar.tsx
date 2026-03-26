import { useEditorStore } from '../../stores/editorStore'
import { useThemeStore } from '../../stores/themeStore'
import { getGlobalEditorView } from '../../editor/editorViewRef'
import {
  toggleBold,
  toggleItalic,
  toggleStrikethrough,
  toggleInlineCode,
  setHeading,
  insertCodeBlock,
  toggleBlockquote,
  toggleUnorderedList,
  toggleOrderedList,
  insertTable,
  insertLink,
  insertImage,
  insertHorizontalRule,
} from '../../editor/commands/markdownCommands'
import {
  IconBold,
  IconItalic,
  IconStrikethrough,
  IconInlineCode,
  IconH1,
  IconH2,
  IconH3,
  IconList,
  IconOrderedList,
  IconQuote,
  IconCodeBlock,
  IconTable,
  IconLink,
  IconImage,
  IconHorizontalRule,
  IconSource,
  IconSplit,
  IconEye,
  IconWysiwyg,
  IconMoon,
  IconSun,
} from '../Icons'

/**
 * 工具栏组件 —— Apple HIG 风格
 * SVG 图标，毛玻璃背景，微妙的 hover 动效
 */
function Toolbar() {
  const { viewMode, setViewMode } = useEditorStore()
  const { toggleTheme, theme } = useThemeStore()

  /** 在编辑器上执行命令 */
  const exec = (fn: (view: any) => void) => {
    const view = getGlobalEditorView()
    if (view) fn(view)
  }

  return (
    <div className="toolbar">
      {/* 格式化操作 */}
      <div className="toolbar-group">
        <ToolbarButton title="加粗 (Ctrl+B)" onClick={() => exec(toggleBold)}><IconBold size={16} /></ToolbarButton>
        <ToolbarButton title="斜体 (Ctrl+I)" onClick={() => exec(toggleItalic)}><IconItalic size={16} /></ToolbarButton>
        <ToolbarButton title="删除线 (Alt+Shift+5)" onClick={() => exec(toggleStrikethrough)}><IconStrikethrough size={16} /></ToolbarButton>
        <ToolbarButton title="行内代码" onClick={() => exec(toggleInlineCode)}><IconInlineCode size={16} /></ToolbarButton>
      </div>

      <div className="toolbar-divider" />

      {/* 段落操作 */}
      <div className="toolbar-group">
        <ToolbarButton title="标题 1 (Ctrl+1)" onClick={() => exec((v) => setHeading(v, 1))}><IconH1 size={16} /></ToolbarButton>
        <ToolbarButton title="标题 2 (Ctrl+2)" onClick={() => exec((v) => setHeading(v, 2))}><IconH2 size={16} /></ToolbarButton>
        <ToolbarButton title="标题 3 (Ctrl+3)" onClick={() => exec((v) => setHeading(v, 3))}><IconH3 size={16} /></ToolbarButton>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <ToolbarButton title="无序列表" onClick={() => exec(toggleUnorderedList)}><IconList size={16} /></ToolbarButton>
        <ToolbarButton title="有序列表" onClick={() => exec(toggleOrderedList)}><IconOrderedList size={16} /></ToolbarButton>
        <ToolbarButton title="引用" onClick={() => exec(toggleBlockquote)}><IconQuote size={16} /></ToolbarButton>
        <ToolbarButton title="代码块" onClick={() => exec(insertCodeBlock)}><IconCodeBlock size={16} /></ToolbarButton>
        <ToolbarButton title="表格" onClick={() => exec(insertTable)}><IconTable size={16} /></ToolbarButton>
        <ToolbarButton title="链接 (Ctrl+K)" onClick={() => exec(insertLink)}><IconLink size={16} /></ToolbarButton>
        <ToolbarButton title="图片 (Ctrl+Shift+I)" onClick={() => exec(insertImage)}><IconImage size={16} /></ToolbarButton>
        <ToolbarButton title="水平线" onClick={() => exec(insertHorizontalRule)}><IconHorizontalRule size={16} /></ToolbarButton>
      </div>

      {/* 右侧：视图/主题 */}
      <div className="toolbar-spacer" />
      <div className="toolbar-group">
        <ToolbarButton
          title="源码模式"
          onClick={() => setViewMode('source')}
          active={viewMode === 'source'}
        >
          <IconSource size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="即时渲染 (Ctrl+Shift+R)"
          onClick={() => setViewMode('wysiwyg')}
          active={viewMode === 'wysiwyg'}
        >
          <IconWysiwyg size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="实时预览（分屏）"
          onClick={() => setViewMode('live')}
          active={viewMode === 'live'}
        >
          <IconSplit size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="预览模式"
          onClick={() => setViewMode('preview')}
          active={viewMode === 'preview'}
        >
          <IconEye size={16} />
        </ToolbarButton>
        <ToolbarButton
          title={theme === 'light' ? '切换到暗色主题' : '切换到亮色主题'}
          onClick={toggleTheme}
        >
          {theme === 'light' ? <IconMoon size={16} /> : <IconSun size={16} />}
        </ToolbarButton>
      </div>
    </div>
  )
}

/* ========== 通用工具栏按钮组件 ========== */

interface ToolbarButtonProps {
  title: string
  onClick: () => void
  active?: boolean
  children: React.ReactNode
}

function ToolbarButton({ title, onClick, active, children }: ToolbarButtonProps) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`toolbar-btn ${active ? 'active' : ''}`}
    >
      {children}
    </button>
  )
}

export default Toolbar
