# ui-theme Specification

## Purpose
TBD - created by archiving change refactor-apple-ui-style. Update Purpose after archive.
## Requirements
### Requirement: Apple HIG 配色体系
应用 SHALL 使用 Apple Human Interface Guidelines 标准配色方案，包含亮色和暗色两套完整的颜色 token，所有颜色通过 CSS 变量管理。

#### Scenario: 亮色主题配色
- **WHEN** 应用处于亮色主题
- **THEN** 背景色为 `#ffffff`，面板色为 `#f5f5f7`，主文字色为 `#1d1d1f`，强调色为 `#007aff`，边框使用半透明 `rgba(0,0,0,0.08)`

#### Scenario: 暗色主题配色
- **WHEN** 应用处于暗色主题
- **THEN** 背景色为 `#1c1c1e`，面板色为 `#2c2c2e`，主文字色为 `#f5f5f7`，强调色为 `#0a84ff`，边框使用半透明 `rgba(255,255,255,0.08)`

### Requirement: Apple 式间距与圆角体系
应用 SHALL 使用 4px 倍数的间距体系和 Apple 标准圆角值（6/10/14/20px），所有间距和圆角通过 CSS 变量统一管理。

#### Scenario: 间距一致性
- **WHEN** 任意 UI 组件使用间距值
- **THEN** 间距 SHALL 为 4px 的整数倍（4/8/12/16/20/24/32/48）

#### Scenario: 圆角一致性
- **WHEN** 交互元素需要圆角
- **THEN** 圆角 SHALL 使用预定义变量：按钮=6px，面板=10px，弹窗=14px

### Requirement: 系统字体栈
应用 SHALL 使用以 Apple SF Pro 为首选的系统字体栈，不加载外部字体资源。

#### Scenario: 正文字体
- **WHEN** 渲染正文内容
- **THEN** 字体栈为 `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', 'Segoe UI', Roboto, sans-serif`

#### Scenario: 等宽字体
- **WHEN** 渲染代码内容
- **THEN** 字体栈为 `'SF Mono', 'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace`

### Requirement: 毛玻璃效果
工具栏和侧边栏 SHALL 使用半透明背景配合 `backdrop-filter: blur` 实现毛玻璃效果，不支持该特性的环境 SHALL 回退为纯色背景。

#### Scenario: 支持 backdrop-filter 的环境
- **WHEN** 浏览器支持 `backdrop-filter`
- **THEN** 工具栏和侧边栏显示半透明毛玻璃效果

#### Scenario: 不支持 backdrop-filter 的环境
- **WHEN** 浏览器不支持 `backdrop-filter`
- **THEN** 工具栏和侧边栏回退为纯色背景，不影响可用性

### Requirement: Apple 式阴影体系
浮层元素（弹窗、下拉菜单、右键菜单）SHALL 使用分层阴影，暗色主题下阴影更深。

#### Scenario: 弹窗阴影
- **WHEN** 弹窗显示
- **THEN** 弹窗使用大层级阴影（`--shadow-lg`），暗色主题下阴影透明度更高

### Requirement: Apple 式动效曲线
UI 过渡动画 SHALL 使用 Apple 标准的贝塞尔曲线，持续时间在 150ms-350ms 之间。

#### Scenario: Hover 效果
- **WHEN** 用户 hover 可交互元素
- **THEN** 背景色变化使用 `cubic-bezier(0.25, 0.1, 0.25, 1)` 曲线，持续 150ms

