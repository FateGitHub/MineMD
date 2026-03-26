# ui-layout Specification

## Purpose
TBD - created by archiving change refactor-apple-ui-style. Update Purpose after archive.
## Requirements
### Requirement: SVG 图标体系
工具栏、侧边栏和上下文菜单 SHALL 使用统一风格的 SVG 图标（Lucide 线条风格，1.5px 线宽），替代当前的 Emoji/Unicode 字符。所有图标通过 `src/components/Icons.tsx` 集中管理。

#### Scenario: 工具栏图标
- **WHEN** 工具栏渲染
- **THEN** 所有按钮图标为 SVG React 组件，尺寸 18×18px，颜色随 `currentColor` 变化

#### Scenario: 侧边栏文件树图标
- **WHEN** 文件树渲染文件和文件夹
- **THEN** 文件夹图标和文件图标为 SVG，不使用 Emoji

#### Scenario: 上下文菜单图标
- **WHEN** 右键菜单渲染
- **THEN** 菜单项图标为 SVG React 组件，尺寸 16×16px

### Requirement: 精简工具栏布局
工具栏 SHALL 保持高效精简，按钮尺寸统一为 32×32px 触摸目标，组间距通过 12px 间隔区分，减少分割线使用。

#### Scenario: 工具栏按钮尺寸
- **WHEN** 工具栏按钮渲染
- **THEN** 按钮宽高 SHALL 为 32×32px，内部图标 18×18px，hover 时显示圆角背景色变化

#### Scenario: 工具栏分组
- **WHEN** 工具栏按钮分组
- **THEN** 组内按钮间距 2px，组间间距 12px，最多使用 2 个视觉分割线

### Requirement: Apple 分段控制器样式标签页
侧边栏标签切换 SHALL 使用 Apple 分段控制器（Segmented Control）样式，包含圆角背景滑块、选中状态高亮。

#### Scenario: 分段控制器外观
- **WHEN** 侧边栏标签页渲染
- **THEN** 标签组有圆角容器背景，选中项有白色（亮色）/深色（暗色）滑块背景和微妙阴影

### Requirement: 标题栏优化
标题栏高度 SHALL 为 38px，文件名居中显示，左侧侧边栏切换按钮使用 SVG 图标。

#### Scenario: 标题栏布局
- **WHEN** 标题栏渲染
- **THEN** 高度 38px，文件名水平居中，字体大小 13px，字重 500

### Requirement: 弹窗与浮层优化
弹窗和浮层 SHALL 使用 14px 圆角、分层阴影、半透明遮罩，输入框聚焦时显示 Apple Blue 光环。

#### Scenario: 弹窗外观
- **WHEN** 弹窗（快速打开/全局搜索/版本历史）显示
- **THEN** 弹窗圆角 14px，阴影为 `--shadow-lg`，遮罩背景 `rgba(0,0,0,0.3)`

#### Scenario: 输入框聚焦
- **WHEN** 弹窗内输入框获得焦点
- **THEN** 输入框显示 Apple Blue (`#007aff`) 色的 focus ring（`box-shadow: 0 0 0 3px rgba(0,122,255,0.3)`）

### Requirement: 状态栏精简
状态栏高度 SHALL 为 22px，文字大小 11px，使用更清晰的分隔和更柔和的颜色。

#### Scenario: 状态栏外观
- **WHEN** 状态栏渲染
- **THEN** 高度 22px，背景使用面板色，文字使用辅助色，可点击项 hover 时颜色变深

