<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# MineMD — 项目指导文件

> 本文件为 AI 编程助手提供项目上下文，帮助快速理解项目并高质量地完成编码任务。

## 项目简介

MineMD 是一款本地 Markdown 编辑器，基于 Electron + React 构建。支持三模式编辑（源码/实时预览/预览）、GFM + KaTeX + Mermaid、本地图片渲染、多格式导出、亮暗主题。纯本地桌面应用，跨平台，MIT 协议。

## 技术栈

| 分类 | 技术 | 版本 |
|------|------|------|
| 桌面框架 | Electron | 35 |
| 前端框架 | React + TypeScript | 19 / 5.8 |
| 编辑器引擎 | CodeMirror 6 | 6.x |
| Markdown 解析 | unified / remark / rehype | 11.x |
| 数学公式 | KaTeX | 0.16 |
| 图表 | Mermaid | 11.x |
| 样式 | Tailwind CSS | 3.4 |
| 状态管理 | Zustand | 5.x |
| 构建 | Vite 6 + electron-builder 25 | — |

## 项目结构

```
MineMD/
├── electron/                  # Electron 主进程（ESM）
│   ├── main.ts               # 窗口创建、IPC 注册
│   ├── preload.ts            # 预加载脚本（编译为 CJS）
│   ├── menu.ts               # 原生应用菜单
│   └── ipc/                  # IPC 处理器
│       ├── fileIpc.ts        # 文件读写
│       ├── folderIpc.ts      # 文件夹/文件树
│       └── exportIpc.ts      # 导出（PDF/HTML）
├── src/                       # 渲染进程（React）
│   ├── main.tsx              # React 入口
│   ├── App.tsx               # 根组件（布局、菜单路由、快捷键）
│   ├── components/           # UI 组件
│   │   ├── Editor/           # Editor.tsx / Preview.tsx / ContextMenu.tsx
│   │   ├── Sidebar/          # Sidebar.tsx / FileTree.tsx / Outline.tsx
│   │   ├── TitleBar/         # TitleBar.tsx（标题栏）
│   │   ├── Toolbar/          # Toolbar.tsx（工具栏）
│   │   ├── StatusBar/        # StatusBar.tsx（状态栏）
│   │   └── Modal/            # QuickOpen / GlobalSearch / VersionHistory / Modal
│   ├── editor/               # 编辑器引擎
│   │   ├── editorViewRef.ts  # EditorView 全局引用
│   │   ├── commands/         # markdownCommands.ts（格式化命令集）
│   │   ├── keymaps/          # markdownKeymap.ts（快捷键映射）
│   │   ├── markdown/         # parser.ts（Markdown 解析管线）
│   │   └── themes/           # editorTheme.ts（CodeMirror 主题）
│   ├── stores/               # Zustand 状态
│   │   ├── fileStore.ts      # 文件内容、路径、文件树
│   │   ├── editorStore.ts    # 视图模式、侧边栏、弹窗、缩放
│   │   ├── themeStore.ts     # 亮色/暗色主题
│   │   └── versionStore.ts   # 版本历史
│   ├── hooks/                # useAutoSave.ts
│   ├── utils/                # export.ts / clipboard.ts / wordCount.ts
│   ├── types/                # index.ts（公共类型定义）
│   └── styles/               # index.css
├── themes/                    # default.css（主题变量）
├── vite-env.d.ts             # Electron API 类型声明
├── vite.config.ts            # Vite + Electron 双入口配置
├── tsconfig.json             # 渲染进程 TS 配置
├── tsconfig.node.json        # Node/Vite 配置 TS
├── tailwind.config.js
├── postcss.config.js
└── electron-builder.yml      # 打包配置
```

## 架构要点

### 进程模型
- **主进程**（`electron/`）：ESM 格式，负责窗口管理、原生菜单、IPC 注册
- **Preload**（`electron/preload.ts`）：必须编译为 CJS（Electron 沙盒限制），通过 `contextBridge` 暴露安全 API
- **渲染进程**（`src/`）：React SPA，通过 `window.electronAPI` 调用主进程能力

### IPC 通信
渲染进程不直接访问 Node.js API，所有文件/系统操作通过 IPC：
```
渲染进程 → window.electronAPI.xxx() → preload (ipcRenderer.invoke) → 主进程 (ipcMain.handle)
```

### 菜单事件路由
`App.tsx` 中使用 `editorCommandMap`（映射表）+ `switch-case` 处理菜单 action：
- 编辑器格式命令通过映射表分发
- 文件/视图/主题/弹窗操作通过 switch-case 处理
- 所有状态通过 `getState()` 获取，避免闭包陷阱

### 类型管理
公共类型统一定义在 `src/types/index.ts`：
- `FileEntry`、`WordCount`、`TocItem`、`ViewMode`、`Theme`、`SidebarTab`、`ExportFormat`
- 各 store 通过导入 + 重新导出保持向后兼容

### Markdown 解析管线
```
remark-parse → remark-gfm → remark-math → remark-rehype → rehype-katex → rehype-stringify
```

### 图片加载策略
占位图 → 异步 IPC 读取 → data URL 缓存 → `imageCacheVersion` 状态驱动重渲染

## 开发命令

| 命令 | 用途 |
|------|------|
| `npm run dev` | 开发调试（Vite + Electron HMR） |
| `npm run build` | 完整构建（tsc + Vite + electron-builder） |
| `npm run electron:build` | 快速构建（跳过类型检查） |
| `npx tsc --noEmit` | 仅类型检查 |

## 编码规范

### 通用规则
- TypeScript strict 模式
- React 函数组件 + Hooks，不使用 class 组件
- 组件文件 PascalCase（`Editor.tsx`），工具/Hook 文件 camelCase（`useAutoSave.ts`）
- 代码注释和日志使用**中文**
- 暂无自动化测试框架，通过 `npm run dev` 手动验证

### 状态管理
- 使用 Zustand，每个领域一个 store
- 跨组件通信优先使用 store，避免 prop drilling
- 在 `useCallback` 中使用 `getState()` 获取最新状态，避免闭包陷阱

### 类型定义
- 公共类型放在 `src/types/index.ts`，不要在组件/store 中重复定义
- 如果需要在 store 模块中使用类型，从 types 导入并重新导出

### 性能注意
- Mermaid 使用模块级缓存（`mermaidModule`），避免重复 dynamic import
- 列表类数据用 `useMemo` / `useCallback` 缓存
- 编辑器命令通过静态映射表分发，避免冗长 switch-case

### 图标使用规范
- 所有 UI 图标统一使用 `src/components/Icons.tsx` 中的 SVG 组件
- 禁止使用 Emoji 或 Unicode 字符作为 UI 图标
- 图标组件接受 `size`（默认 16）和 `className` props

### IPC 安全
- 所有 Node.js 操作通过 preload 暴露的 API 调用
- 不在渲染进程直接 `require` 或 `import` Node 模块
- 新增 IPC 通道需同时更新 `preload.ts` 和 `vite-env.d.ts` 的类型声明

## 关键约束

1. **Preload 必须编译为 CJS**：在 `vite.config.ts` 中 `lib: false` + `rollupOptions.output.format: 'cjs'`
2. **纯本地应用**：无外部网络依赖，不调用远程 API
3. **大文件流畅性**：需支持数千行文档的流畅编辑和预览
4. **三模式视图**：`ViewMode` 为 `'source' | 'live' | 'preview'`，编辑器在 preview 模式下隐藏但保持挂载
5. **跨平台**：代码需兼容 macOS、Windows、Linux

## 常见任务指引

### 添加新的编辑器命令
1. 在 `src/editor/commands/markdownCommands.ts` 中实现命令函数
2. 在 `App.tsx` 的 `editorCommandMap` 中注册映射
3. 如需快捷键，在 `src/editor/keymaps/markdownKeymap.ts` 中添加
4. 如需菜单项，在 `electron/menu.ts` 中添加

### 添加新的 IPC 通道
1. 在 `electron/ipc/` 对应文件中添加 `ipcMain.handle`
2. 在 `electron/preload.ts` 中暴露对应 API
3. 在 `vite-env.d.ts` 的 `ElectronAPI` 接口中添加类型声明
4. 在渲染进程中通过 `window.electronAPI.xxx()` 调用

### 添加新的 UI 组件
1. 在 `src/components/` 下创建对应目录和文件（PascalCase）
2. 如需状态，在对应 store 中添加
3. 公共类型放 `src/types/index.ts`

### 添加新的 Zustand Store
1. 在 `src/stores/` 下创建新文件
2. 类型定义放 `src/types/index.ts`
3. 遵循现有 store 的模式（`create<Interface>()(...)` + `getState()` 访问）