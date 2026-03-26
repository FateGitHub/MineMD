## Context

MineMD 是一个 Electron + React 桌面 Markdown 编辑器，当前使用 Typora 风格的 UI。用户希望升级为 Apple HIG 风格，使界面更高效简洁。

本改造涉及多个组件的样式调整和图标替换，需要统一的设计 token 体系来确保一致性。

### 约束
- 纯本地应用：不能加载外部字体 CDN（使用系统字体栈）
- 不引入额外依赖：SVG 图标使用内联 JSX 而非图标库包
- 保持 Tailwind CSS + CSS 变量的现有架构

## Goals / Non-Goals

### Goals
- 建立完整的 Apple HIG 风格设计 token 体系
- 统一所有组件的视觉风格
- 减少视觉噪音，提高内容聚焦
- 提供精致的亮色/暗色双主题

### Non-Goals
- 不改变功能行为或交互逻辑
- 不引入新的 npm 依赖
- 不改变组件结构或状态管理方式
- 不实现 macOS 系统级集成（如 vibrancy API）

## Decisions

### 1. 字体栈

**决定**：使用系统字体栈（SF Pro 优先）

```css
--editor-font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
--editor-mono-font: 'SF Mono', 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Consolas, monospace;
```

**理由**：
- SF Pro 是 Apple 设备的系统字体，渲染最佳
- Inter 作为非 Apple 设备的 fallback（形态与 SF Pro 最接近）
- 不加载外部字体，零网络依赖

### 2. 配色方案

**决定**：采用 Apple 标准色板

| Token | Light | Dark | 说明 |
|-------|-------|------|------|
| `--editor-bg` | `#ffffff` | `#1c1c1e` | 主背景 |
| `--editor-surface` | `#f5f5f7` | `#2c2c2e` | 面板/卡片背景（新增） |
| `--editor-text` | `#1d1d1f` | `#f5f5f7` | 主文字 |
| `--editor-text-secondary` | `#86868b` | `#98989d` | 辅助文字 |
| `--editor-border` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.08)` | 边框（半透明） |
| `--editor-separator` | `rgba(0,0,0,0.12)` | `rgba(255,255,255,0.12)` | 分割线 |
| `--editor-accent` | `#007aff` | `#0a84ff` | 强调色（Apple Blue） |
| `--editor-hover` | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.06)` | Hover 背景 |
| `--editor-active` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.10)` | Active 背景 |

### 3. 间距体系

**决定**：4px 倍数体系（Apple 标准）

```
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-12: 48px
```

### 4. 圆角体系

```
--radius-sm: 6px    （按钮、标签）
--radius-md: 10px   （卡片、面板）
--radius-lg: 14px   （弹窗、模态框）
--radius-xl: 20px   （大型容器）
```

### 5. 阴影体系

```css
/* 细微浮起 */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06);
/* 卡片/面板 */
--shadow-md: 0 4px 12px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);
/* 弹窗/浮层 */
--shadow-lg: 0 12px 40px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06);
/* 暗色下阴影更深 */
.dark --shadow-sm: 0 1px 2px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.3);
.dark --shadow-md: 0 4px 12px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.2);
.dark --shadow-lg: 0 12px 40px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3);
```

### 6. 动效曲线

**决定**：使用 Apple 的 ease 曲线

```css
--ease-default: cubic-bezier(0.25, 0.1, 0.25, 1);    /* 标准 */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);     /* 弹性 */
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 350ms;
```

### 7. 毛玻璃效果

**决定**：在工具栏和侧边栏使用半透明 + backdrop-filter

```css
.toolbar {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
}
```

**理由**：Apple 标志性的毛玻璃效果增加层次感，Electron 完全支持 backdrop-filter。

### 8. 图标方案

**决定**：使用内联 SVG（Lucide 风格，1.5px 线宽，24px 视觉）

**理由**：
- 不引入额外的 npm 依赖
- SVG 颜色随 `currentColor` 变化，自动适配主题
- 像素对齐，比 Emoji/Unicode 字符一致性更好
- Lucide 的线条风格与 Apple SF Symbols 最接近

**实现**：创建 `src/components/Icons.tsx` 统一管理所有 SVG 图标组件

## Risks / Trade-offs

- **风险**：`backdrop-filter` 可能在某些 Linux 配置下性能不佳
  - **缓解**：使用 CSS `@supports` 检测，不支持时回退到纯色背景
- **风险**：系统字体栈在非 Apple 设备上显示效果不同
  - **缓解**：Inter 作为 fallback 字体，形态与 SF Pro 最接近
- **风险**：大量 CSS 变更可能引入细微回归
  - **缓解**：分步骤实施，先 token 后组件，每步手动验证

## Open Questions

- 无（纯样式改造，不涉及功能决策）
