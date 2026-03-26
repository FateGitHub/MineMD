# Change: Apple HIG 风格 UI 优化 — 更高效、更简洁

## Why

当前 MineMD 的界面风格偏向 Typora/VS Code 的传统桌面应用审美（灰色边框、扁平按钮、Emoji 图标），缺少现代感和精致感。用户期望一个更接近 Apple 设计语言（HIG）的界面，具备以下特点：

1. **视觉噪音过多**：工具栏按钮使用 Emoji/Unicode 字符，视觉权重不一致，占据了宝贵的垂直空间
2. **配色缺少层次**：亮色主题使用纯白 `#ffffff`，暗色使用 `#1e1e1e`，缺乏 Apple 式的磨砂半透明层次感
3. **字体不够精致**：使用 `Open Sans` 而非 Apple 首选的 SF Pro/Inter 字体栈
4. **间距/圆角不统一**：各组件的 padding、border-radius、gap 值散乱，缺乏 4px/8px 倍数的节奏感
5. **动效生硬**：过渡时间短且缺乏 Apple 标志性的弹性曲线

## What Changes

### 1. 设计系统 Token 升级（CSS 变量）
- 采用 Apple 式配色：亮色主题背景 `#f5f5f7`（Apple 标志灰），暗色 `#1d1d1f`
- 引入半透明毛玻璃背景（`backdrop-filter: blur`）用于工具栏和侧边栏
- 统一间距为 4px 倍数体系：4/8/12/16/20/24/32/48
- 统一圆角：small=6px, medium=10px, large=14px（Apple 标准）
- 引入更柔和的阴影体系
- 字体升级为 `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter'` 优先

### 2. 工具栏简化 — 关键性简化
- **移除 Emoji 图标**，替换为纯 SVG 图标（Lucide 图标库风格，使用内联 SVG）
- 优化按钮尺寸：32×32px 触摸目标，视觉 20×20px 图标
- 增加 `toolbar-btn` 的 hover 效果：Apple 式的微妙背景色变化
- 分组逻辑优化：减少分割线，增加组间距

### 3. 标题栏优化
- 增加标题栏高度至 38px（匹配 macOS 标题栏）
- 文件名居中显示，使用更精致的字重
- 侧边栏切换按钮使用 SVG 图标

### 4. 侧边栏美化
- 半透明毛玻璃背景
- 标签页使用 Apple 分段控制器（Segmented Control）样式
- 文件树项增加圆角 hover 效果
- 图标替换为 SVG

### 5. 状态栏优化
- 高度调整为 22px
- 减少信息密度，更清晰的分隔
- 可点击项增加微妙的 hover 反馈

### 6. 弹窗 / 面板优化
- 增大弹窗圆角至 14px
- 增强阴影层次
- 输入框增加聚焦光环（focus ring）
- 搜索面板增加半透明背景

### 7. 编辑器区域
- 更宽松的行间距和段间距
- 优化光标样式
- 活跃行高亮使用极淡的背景色

### 8. 暗色主题全面优化
- 更深的背景色搭配更高对比度文字
- 毛玻璃效果适配暗色
- 暗色下的阴影和边框微调

## Impact
- Affected specs: ui-theme, ui-layout (新建)
- Affected code:
  - `src/styles/index.css` — 主要改动（~80% CSS 变量和样式重写）
  - `themes/default.css` — 同步更新变量
  - `src/components/Toolbar/Toolbar.tsx` — Emoji→SVG 图标替换
  - `src/components/TitleBar/TitleBar.tsx` — 微调图标和高度
  - `src/components/Sidebar/Sidebar.tsx` — 分段控制器样式
  - `src/components/Sidebar/FileTree.tsx` — SVG 图标替换
  - `src/components/StatusBar/StatusBar.tsx` — 微调
  - `src/components/Editor/ContextMenu.tsx` — 样式更新
  - `src/components/Modal/*.tsx` — 弹窗样式更新
  - `src/editor/themes/editorTheme.ts` — CodeMirror 主题同步
  - `tailwind.config.js` — token 同步
- 不涉及任何功能逻辑变更，纯视觉/样式改造
- 不影响 IPC 通信、文件操作、Markdown 解析等核心功能
