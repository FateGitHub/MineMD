# Project Context

## Purpose
MineMD — 类 Typora 的所见即所得 Markdown 编辑器。三模式编辑（源码/实时预览/预览）、GFM + KaTeX + Mermaid、本地图片渲染、多格式导出、亮暗主题。纯本地桌面应用，跨平台（macOS/Windows/Linux），MIT 协议。

## Tech Stack

| 类别 | 技术 |
|------|------|
| 框架 | Electron 35 + React 19 + TypeScript 5.8 |
| 编辑器 | CodeMirror 6 + unified/remark/rehype + KaTeX + Mermaid |
| 样式 | Tailwind CSS 3（`darkMode: 'class'`，CSS 变量主题）+ Apple HIG 风格 Token 体系 |
| 图标 | 统一 SVG 图标库（30+ 个 Lucide 风格组件，`src/components/Icons.tsx`） |
| 状态 | Zustand 5（fileStore / editorStore / themeStore / versionStore） |
| 构建 | Vite 6 + vite-plugin-electron + electron-builder 25 |
| 模块 | 主进程 ESM / Preload CJS（沙盒限制）/ 渲染进程 ESM |

## Architecture

```
主进程 (electron/, ESM)
├── main.ts        — 窗口创建、IPC 注册
├── menu.ts        — 原生菜单
├── preload.ts     → preload.cjs (CJS, contextBridge 桥接)
└── ipc/           — fileIpc / folderIpc / exportIpc

渲染进程 (src/, React)
├── components/    — Icons.tsx (SVG 图标库) / Editor / Sidebar / Toolbar / StatusBar / Modal
├── editor/        — commands / extensions / keymaps / markdown parser / themes
├── stores/        — Zustand 状态管理
├── hooks/         — useAutoSave 等
├── utils/         — export / clipboard / wordCount
└── types/         — TypeScript 类型定义
```

### 关键设计
- **Apple HIG 风格 UI**：SF Pro/Inter 字体栈、Apple 标准圆角（6/10/14/20px）、毛玻璃半透明（`backdrop-filter: blur(20px)`）、Apple Blue Accent（`#007aff`）、弹性曲线动效
- **SVG 图标体系**：统一的 Lucide 风格 SVG 图标组件（`Icons.tsx`），替代 Emoji/Unicode
- **IPC 通信**：preload 暴露安全 API（contextBridge），渲染进程通过 `window.electronAPI` 调用
- **图片加载**：占位图 → 异步 IPC 读取 → data URL 缓存 → `imageCacheVersion` 状态驱动重渲染
- **Markdown 管线**：remark-parse → remark-gfm → remark-math → remark-rehype → rehype-katex → rehype-stringify
- **主题**：CSS 变量 Token 体系 + Tailwind `darkMode: 'class'`，themeStore 切换

## Conventions

- TypeScript strict，React 函数组件 + Hooks
- 组件文件 PascalCase，工具/Hook 文件 camelCase
- 导入路径 `@/` → `src/`
- 代码注释和日志使用中文
- 暂无自动化测试，手动 `npm run dev` 验证

## Constraints

- Preload 必须编译为 CJS（`lib: false` + `rollupOptions.output.format: 'cjs'`）
- 纯本地应用，无外部网络依赖
- 大文件（数千行）需流畅编辑和预览
