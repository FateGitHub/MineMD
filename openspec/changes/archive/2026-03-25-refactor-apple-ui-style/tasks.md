## 1. 设计 Token 基础设施

- [x] 1.1 更新 `src/styles/index.css` 中的 `:root` CSS 变量：新增 `--editor-surface`、`--editor-accent`、`--editor-hover`、`--editor-active`、`--editor-separator`，更新配色为 Apple 标准
- [x] 1.2 新增间距变量 `--space-1` 到 `--space-12`（4px 倍数体系）
- [x] 1.3 新增圆角变量 `--radius-sm/md/lg/xl`
- [x] 1.4 新增阴影变量 `--shadow-sm/md/lg`（亮色和暗色分别定义）
- [x] 1.5 新增动效变量 `--ease-default/spring`、`--duration-fast/normal/slow`
- [x] 1.6 更新字体变量为 Apple 系统字体栈
- [x] 1.7 同步更新 `.dark` 选择器下的所有变量
- [x] 1.8 同步更新 `themes/default.css` 中的变量
- [x] 1.9 同步更新 `tailwind.config.js` 中的 token 映射

## 2. SVG 图标体系

- [x] 2.1 创建 `src/components/Icons.tsx`，定义所有 SVG 图标组件（Bold、Italic、Strikethrough、Code、H1-H3、List、OrderedList、Quote、CodeBlock、Table、Link、Image、HorizontalRule、Eye、Split、Source、Moon、Sun、Sidebar、Folder、File、ChevronRight 等）
- [x] 2.2 更新 `Toolbar.tsx`：将所有 Emoji/Unicode 替换为 SVG 图标组件
- [x] 2.3 更新 `TitleBar.tsx`：侧边栏切换按钮使用 SVG 图标
- [x] 2.4 更新 `FileTree.tsx`：文件夹和文件图标使用 SVG
- [x] 2.5 更新 `ContextMenu.tsx`：菜单项图标使用 SVG 组件

## 3. 组件样式更新 — 工具栏

- [x] 3.1 更新 `.toolbar` 样式：高度 40px，毛玻璃背景，更精致的底部边框
- [x] 3.2 更新 `.toolbar-btn` 样式：32×32px，圆角 6px，Apple 式 hover/active 效果
- [x] 3.3 更新 `.toolbar-dropdown-menu` 样式：圆角 10px，分层阴影，更精致的菜单项
- [x] 3.4 优化工具栏分组间距和分割线样式

## 4. 组件样式更新 — 标题栏

- [x] 4.1 更新 `.titlebar` 样式：高度 38px，使用面板色背景，文件名 13px/500 字重
- [x] 4.2 更新侧边栏切换按钮样式：圆角 hover 效果

## 5. 组件样式更新 — 侧边栏

- [x] 5.1 更新 `.sidebar-wrapper` 样式：毛玻璃背景，更柔和的右侧边框
- [x] 5.2 实现 Apple 分段控制器样式的 `.sidebar-tabs`：圆角容器、滑块背景、微阴影
- [x] 5.3 更新 Sidebar.tsx 组件：标签页增加滑块动画
- [x] 5.4 更新 `.file-tree-item` 样式：圆角 hover，左侧 padding 调整
- [x] 5.5 更新 `.outline-item` 样式：与文件树风格统一

## 6. 组件样式更新 — 状态栏

- [x] 6.1 更新 `.statusbar` 样式：高度 22px，使用面板色背景
- [x] 6.2 优化分割线样式和间距

## 7. 组件样式更新 — 弹窗/浮层

- [x] 7.1 更新 `.quick-open-panel` 样式：圆角 14px，分层阴影
- [x] 7.2 更新 `.quick-open-input` 样式：聚焦 focus ring
- [x] 7.3 更新 `.global-search-panel` 样式
- [x] 7.4 更新版本历史弹窗样式
- [x] 7.5 更新通用 Modal 组件样式
- [x] 7.6 更新 `.context-menu` 和 `.context-submenu` 样式：圆角 10px，分层阴影

## 8. 编辑器区域

- [x] 8.1 更新 `src/editor/themes/editorTheme.ts`：同步新配色和字体
- [x] 8.2 更新 `.editor-wrapper` 和 `.editor-content-area` 样式
- [x] 8.3 更新活跃行高亮样式（极淡背景色）
- [x] 8.4 更新 CodeMirror 搜索面板样式覆盖
- [x] 8.5 更新 `.markdown-body` 预览样式：同步新配色

## 9. 滚动条与动效

- [x] 9.1 更新滚动条样式：更细更圆润
- [x] 9.2 所有 `transition` 属性替换为新的动效变量
- [x] 9.3 更新弹窗/菜单出现动画使用新曲线

## 10. 验证

- [x] 10.1 `npm run dev` 验证亮色主题整体效果
- [x] 10.2 切换暗色主题验证
- [x] 10.3 验证三模式（源码/实时预览/预览）切换
- [x] 10.4 验证侧边栏展开/折叠动画
- [x] 10.5 验证所有弹窗（快速打开/全局搜索/版本历史）
- [x] 10.6 验证右键上下文菜单
- [x] 10.7 验证工具栏所有按钮和下拉菜单
- [x] 10.8 `npx tsc --noEmit` 确保无类型错误
