import { useFileStore } from '../../stores/fileStore'
import { useEditorStore } from '../../stores/editorStore'
import type { SidebarTab } from '../../stores/editorStore'
import { IconFolder } from '../Icons'
import FileTree from './FileTree'
import Outline from './Outline'

/**
 * 侧边栏组件 —— Apple HIG 风格
 * 分段控制器标签 + 毛玻璃背景
 */
function Sidebar() {
  const { sidebarTab, setSidebarTab } = useEditorStore()
  const { folderPath, openFolder } = useFileStore()

  const tabs: { key: SidebarTab; label: string }[] = [
    { key: 'files', label: '文件' },
    { key: 'outline', label: '大纲' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Apple 分段控制器标签 */}
      <div className="sidebar-tabs">
        <div className="sidebar-tabs-inner">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`sidebar-tab-btn ${sidebarTab === tab.key ? 'active' : ''}`}
              onClick={() => setSidebarTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区 */}
      <div className="sidebar-content">
        {sidebarTab === 'files' && (
          folderPath ? (
            <FileTree />
          ) : (
            <div className="file-tree-empty">
              <span style={{ marginBottom: '12px', opacity: 0.3, color: 'var(--editor-text-secondary)' }}>
                <IconFolder size={32} />
              </span>
              <span>尚未打开文件夹</span>
              <button className="open-btn" onClick={openFolder}>
                打开文件夹
              </button>
            </div>
          )
        )}
        {sidebarTab === 'outline' && <Outline />}
      </div>
    </div>
  )
}

export default Sidebar
