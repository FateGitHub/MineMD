# MineMD - 简洁高效的 Markdown 编辑器

<p align="center">
  <strong>一款所见即所得 Markdown 编辑器</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-brightgreen" alt="Version">
  <img src="https://img.shields.io/badge/Electron-35-47848F?logo=electron" alt="Electron">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

## 项目概述

MineMD 是一款简洁高效的本地 Markdown 编辑器和阅读器，基于 Electron + React 构建。支持**四模式编辑**（源码 / 实时预览 / 纯预览 / 所见即所得）、GFM + KaTeX + Mermaid、本地图片渲染、多格式导出、亮暗主题切换等功能。纯本地桌面应用，无需网络，跨平台，MIT 协议。

## 技术栈

| 分类 | 技术 |
|------|------|
| **前端框架** | Electron 35 + React 19 + TypeScript 5.8 |
| **编辑器核心** | CodeMirror 6（底层编辑引擎）+ 自定义实时预览渲染 |
| **Markdown 解析** | unified / remark / rehype 生态 |
| **数学公式** | KaTeX |
| **图表支持** | Mermaid（流程图、时序图、甘特图等） |
| **样式** | Tailwind CSS 3 + 自定义 CSS |
| **构建工具** | Vite 6 + electron-builder |
| **状态管理** | Zustand 5 |
| **模块系统** | ESM（主进程） + CJS（preload 脚本） |
| **跨平台** | 支持 macOS、Windows、Linux |

## 核心功能模块

### 1. 四模式编辑系统
- **源码模式** (`Ctrl+/`): 纯 CodeMirror 编辑器，显示 Markdown 原始文本，编辑器独占全屏
- **实时预览模式** (`Ctrl+Shift+L`): 左右分屏，左侧源码编辑 + 右侧实时渲染预览，滚动同步
- **预览模式** (`Ctrl+Shift+P`): 纯只读预览，隐藏编辑器，预览独占全屏
- **即时渲染模式** (`Ctrl+Shift+R`): Typora 风格所见即所得，光标所在块显示源码，离开后立即渲染为 HTML
- 可通过工具栏、状态栏、菜单及快捷键切换

### 2. Markdown 语法支持
- **基础语法**: 标题(H1-H6)、段落、换行、加粗、斜体、删除线、下划线
- **GFM 扩展**: 任务列表、表格、围栏代码块、自动链接
- **代码块**: 语法高亮，支持常见编程语言
- **引用**: 块引用，支持嵌套
- **列表**: 有序列表、无序列表、任务列表
- **链接与图片**: 行内链接、参考链接、图片插入与预览
- **表格**: 创建和编辑表格，支持对齐
- **水平线**: `---`、`***`、`___`
- **HTML 注释**: `<!-- comment -->`
- **Emoji**: 支持 emoji 表情 😊
- **高亮文本**: `==highlight==`
- **上下标**: 上标 `X^2^`、下标 `H~2~O`
- **数学公式**: 行内公式 `$...$` 和块级公式 `$$...$$`（KaTeX 渲染）
- **脚注**: `[^1]` 脚注引用

### 3. 本地图片支持
- **自动渲染**: Markdown 中的相对路径图片自动通过 IPC 读取并渲染
- **智能缓存**: 图片加载后缓存为 data URL，避免重复读取文件
- **React 状态驱动**: 图片加载采用两阶段渲染策略（占位图 → 异步加载 → 状态更新 → 重新渲染），避免 DOM 操作竞态
- **截图粘贴**: 自动保存截图到当前文件所在目录的 `assets/` 下，并插入图片引用

### 4. 图表支持
- **流程图**: Mermaid flowchart
- **时序图**: Mermaid sequence diagram
- **甘特图**: Mermaid gantt chart
- 图表代码块实时预览

### 5. 文件管理
- **文件树侧边栏**: 以层级结构展示打开的文件夹
- **文件列表视图**: 以列表形式展示文件
- **快速打开**: `Ctrl+P` 模糊搜索文件
- **全局搜索**: `Ctrl+Shift+F` 在文件夹中搜索内容
- **自动保存**: 定时自动保存，防止内容丢失
- **文件格式过滤**: 仅显示 Markdown、文本等支持的文件格式

### 6. 目录与大纲
- 根据文档标题自动生成目录（TOC）
- 大纲面板可固定在侧边栏
- 点击目录项快速跳转到对应位置
- 实时更新目录结构

### 7. 字数统计
- 状态栏显示字数统计
- 支持选中文字显示选区字数
- 详细统计（字符数、单词数、行数、段落数等）

### 8. 剪贴板与粘贴
- **复制为 HTML**: 默认复制行为，方便粘贴到其他富文本应用
- **复制为 Markdown**: `Shift+Ctrl+C` 复制 Markdown 源码
- **智能粘贴**: 自动分析剪贴板内容格式
  - URL 自动转为 Markdown 链接，图片 URL 自动转为图片标记
  - **截图粘贴**: 自动保存截图到当前文件所在目录的 `assets/` 下，并插入 `![图片](assets/xxx.png)` 引用
  - 支持 PNG/JPG/GIF/WebP 格式，文件名按时间戳自动生成
- **粘贴为纯文本**: `Shift+Ctrl+V`

### 9. 主题与外观
- **Apple HIG 风格 UI**：遵循 Apple Human Interface Guidelines 设计语言
  - SF Pro / Inter 系统字体栈
  - Apple 标准圆角体系（6/10/14/20px）
  - 毛玻璃半透明效果（`backdrop-filter: blur(20px)`）
  - Apple 蓝色 Accent（`#007aff`）
  - Apple 弹性曲线动效（`cubic-bezier(0.25, 0.46, 0.45, 0.94)`）
- **统一 SVG 图标体系**：30+ 个 Lucide 风格 SVG 图标组件，替代 Emoji/Unicode
- 内置亮色/暗色双主题
- 支持自定义主题（CSS 变量体系）
- 亮色/暗色模式切换（工具栏 + 菜单）
- 编辑器字体、字号可配置
- 缩放支持（放大/缩小/重置）

### 10. 导出与导入
- **导出格式**: PDF、HTML（带样式）、HTML（无样式）
- **打印**: 调用系统打印对话框 (`Ctrl+Shift+P`)
- **导入**: 支持导入 `.md`、`.txt` 等文本文件

### 11. 右键上下文菜单
- 编辑器区域右键弹出 Typora 风格上下文菜单，支持二级子菜单
- **插入** ▸ 链接(`Ctrl+K`)、图片(`Ctrl+Shift+I`)、表格(`Ctrl+T`)、代码块(`Ctrl+Shift+K`)、公式块(`Ctrl+Shift+M`)、引用(`Ctrl+Shift+Q`)、水平线、任务列表
- **文本格式** ▸ 加粗(`Ctrl+B`)、斜体(`Ctrl+I`)、下划线(`Ctrl+U`)、删除线(`Alt+Shift+5`)、行内代码(`` Ctrl+Shift+` ``)、行内公式、高亮
- **标题** ▸ 标题 1~6（`Ctrl+1~6`）
- **无序列表** (`Ctrl+Shift+]`) / **有序列表** (`Ctrl+Shift+[`)
- **导入 .md 文档**: 快速打开 Markdown 文件
- **格式化** (`Alt+Shift+F`): 美化文档（统一空行、修剪尾部空白、标题前保证空行）
- **重置文档**: 从磁盘重新加载当前文件
- **清空内容**: 清空编辑器全部内容
- **复制** (`Ctrl+C`) / **粘贴** (`Ctrl+V`)
- 支持 ESC 键、点击外部、滚动时自动关闭菜单
- 子菜单延迟显示/隐藏，位置自动修正不超出屏幕

### 12. 快捷键支持
- 完整的快捷键体系，覆盖文件操作、段落格式、行内格式、视图切换
- 通过 Electron 原生菜单和 CodeMirror keymap 双重支持

### 13. 版本控制
- 文件历史版本记录
- 支持查看和恢复历史版本
- 版本历史弹窗展示

## 项目结构

```
MineMD/
├── electron/                  # Electron 主进程（ESM）
│   ├── main.ts               # 主进程入口（窗口创建、IPC 注册）
│   ├── preload.ts            # 预加载脚本（暴露 IPC API 到渲染进程，编译为 CJS）
│   ├── menu.ts               # 应用菜单（文件/编辑/段落/格式/视图/主题/版本/帮助）
│   └── ipc/                  # IPC 通信处理
│       ├── fileIpc.ts        # 文件操作 IPC（读写、对话框、图片读取）
│       ├── folderIpc.ts      # 文件夹操作 IPC（读取文件树、搜索）
│       └── exportIpc.ts      # 导出操作 IPC（PDF、HTML）
├── src/                       # 渲染进程（React）
│   ├── main.tsx              # React 入口
│   ├── App.tsx               # 应用根组件（布局、菜单事件路由、快捷键）
│   ├── components/           # UI 组件
│   │   ├── Icons.tsx         # 统一 SVG 图标库（30+ 个 Lucide 风格图标组件）
│   │   ├── Editor/           # 编辑器核心
│   │   │   ├── Editor.tsx    # CodeMirror 编辑器组件
│   │   │   ├── ContextMenu.tsx # 右键上下文菜单组件
│   │   │   └── Preview.tsx   # Markdown 预览组件（滚动同步 + 本地图片渲染）
│   │   ├── Sidebar/          # 侧边栏
│   │   │   ├── Sidebar.tsx   # 侧边栏容器（文件树/大纲切换）
│   │   │   ├── FileTree.tsx  # 文件树组件
│   │   │   └── Outline.tsx   # 大纲组件
│   │   ├── Toolbar/          # 工具栏
│   │   │   └── Toolbar.tsx   # 工具栏（格式化按钮、视图切换、主题切换）
│   │   ├── StatusBar/        # 状态栏
│   │   │   └── StatusBar.tsx # 状态栏（字数统计、模式切换、行列号）
│   │   └── Modal/            # 弹窗组件
│   │       ├── Modal.tsx     # 通用弹窗容器
│   │       ├── QuickOpen.tsx # 快速打开弹窗
│   │       ├── GlobalSearch.tsx # 全局搜索弹窗
│   │       └── VersionHistory.tsx # 版本历史弹窗
│   ├── editor/               # 编辑器引擎
│   │   ├── editorViewRef.ts  # EditorView 全局引用
│   │   ├── commands/         # 编辑器命令
│   │   │   └── markdownCommands.ts # Markdown 格式化命令集
│   │   ├── extensions/       # CodeMirror 扩展
│   │   │   └── index.ts      # 扩展配置
│   │   ├── keymaps/          # 快捷键映射
│   │   │   └── markdownKeymap.ts # Markdown 快捷键
│   │   ├── markdown/         # Markdown 解析
│   │   │   └── parser.ts     # unified/remark/rehype 解析器
│   │   └── themes/           # 编辑器主题
│   │       └── editorTheme.ts # CodeMirror 主题配置
│   ├── stores/               # 状态管理（Zustand）
│   │   ├── fileStore.ts      # 文件状态（内容、路径、文件树）
│   │   ├── editorStore.ts    # 编辑器状态（视图模式、侧边栏、弹窗、缩放）
│   │   ├── themeStore.ts     # 主题状态（亮色/暗色）
│   │   └── versionStore.ts   # 版本历史状态
│   ├── hooks/                # 自定义 Hooks
│   │   └── useAutoSave.ts    # 自动保存 Hook
│   ├── utils/                # 工具函数
│   │   ├── export.ts         # 导出工具（PDF、HTML、打印）
│   │   ├── clipboard.ts      # 剪贴板工具（智能粘贴、截图保存）
│   │   └── wordCount.ts      # 字数统计工具
│   ├── styles/               # 全局样式
│   │   └── index.css         # 主样式文件
│   └── types/                # TypeScript 类型定义
│       └── index.ts          # 公共类型（含 ElectronAPI 接口声明）
├── themes/                    # 主题 CSS 文件
│   └── default.css           # 默认主题
├── resources/                 # 应用资源（图标等）
├── dist-electron/             # Electron 编译产物（自动生成）
│   ├── main.js               # 主进程（ESM）
│   └── preload.cjs           # 预加载脚本（CJS）
├── vite-env.d.ts             # Electron API 类型声明
├── package.json
├── tsconfig.json             # 渲染进程 TypeScript 配置
├── tsconfig.node.json        # Node.js/Vite 配置文件 TypeScript 配置
├── vite.config.ts            # Vite 构建配置（含 Electron 双入口编译）
├── tailwind.config.js
├── postcss.config.js
├── electron-builder.yml       # 打包配置
└── README.md
```

## 构建

### 环境要求

- **Node.js** >= 18
- **npm** >= 9

### 安装依赖

```bash
npm install
```

### 命令一览

| 命令 | 用途 | 说明 |
|------|------|------|
| `npm run dev` | 开发调试 | 启动 Vite + Electron 开发环境（HMR 热更新） |
| `npm run build` | 完整构建 | tsc 类型检查 + Vite 构建 + Electron 打包 |
| `npm run electron:build` | 快速构建 | 跳过类型检查，直接构建 + 打包 |
| `npm run preview` | Web 预览 | 预览 Vite 构建产物（不含 Electron） |

### 本地调试

```
工具栏 → 视图 → 开发者工具
```

### 架构说明

项目采用 ESM 模块系统（`"type": "module"`），Vite 编译双入口：

- **主进程** (`electron/main.ts`) → 编译为 `dist-electron/main.js`（ESM 格式）
- **预加载脚本** (`electron/preload.ts`) → 编译为 `dist-electron/preload.cjs`（CJS 格式）

> ⚠️ Electron 的沙盒化 preload 脚本不支持 ESM，因此必须编译为 CJS。通过在 Vite 配置中禁用 `vite-plugin-electron` 的默认 `lib` 模式，改用 `rollupOptions.output.format: 'cjs'` 来实现。

## 功能状态

| 功能 | 状态 |
|------|------|
| 四模式编辑系统（源码/实时预览/预览/即时渲染） | ✅ 已完成 |
| Markdown 基础语法支持 | ✅ 已完成 |
| GFM 扩展语法支持 | ✅ 已完成 |
| 代码块语法高亮 | ✅ 已完成 |
| 数学公式渲染（KaTeX） | ✅ 已完成 |
| 图表（Mermaid）支持 | ✅ 已完成 |
| 本地图片渲染与缓存（LRU 策略） | ✅ 已完成 |
| 文件树侧边栏 | ✅ 已完成 |
| 大纲与目录（支持锚点跳转） | ✅ 已完成 |
| 快速打开（Ctrl+P） | ✅ 已完成 |
| 全局搜索（Ctrl+Shift+F） | ✅ 已完成 |
| 字数统计 | ✅ 已完成 |
| 智能剪贴板（截图粘贴） | ✅ 已完成 |
| 主题切换（亮色/暗色） | ✅ 已完成 |
| 导出功能（PDF/HTML/HTML无样式） | ✅ 已完成 |
| 打印功能 | ✅ 已完成 |
| 快捷键系统 | ✅ 已完成 |
| 自动保存 | ✅ 已完成 |
| 版本历史（内存优化，自动淘汰） | ✅ 已完成 |
| 原生菜单栏（文件/编辑/段落/格式/视图/主题/版本/帮助） | ✅ 已完成 |
| 右键上下文菜单（Typora 风格，支持二级子菜单） | ✅ 已完成 |
| 工具栏（格式化按钮 + 视图/主题切换） | ✅ 已完成 |
| 缩放功能（放大/缩小/重置） | ✅ 已完成 |
| Apple HIG 风格 UI（毛玻璃/圆角/SVG 图标/动效） | ✅ 已完成 |
| Error Boundary（全局 + WYSIWYG 编辑器级防崩溃） | ✅ 已完成 |
| 会话恢复（记忆上次文件和文件夹） | ✅ 已完成 |
| 跨平台打包（Windows/macOS/Linux） | ✅ 已完成 |
| 自定义主题 CSS | 🔜 待开发 |
| 扩展导出（Word、RTF 等） | 🔜 待开发 |
| 自定义快捷键绑定 | 🔜 待开发 |

## 稳定性与安全

- **全局 Error Boundary**：捕获未知渲染错误，防止白屏崩溃，提供一键恢复
- **WYSIWYG Error Boundary**：即时渲染模式独立防护，出错可切回源码模式
- **图片缓存 LRU 策略**：限制最大 200 张图片缓存，自动淘汰最早条目，防止内存溢出
- **版本历史内存控制**：每文件最多 50 个快照、全局最多 10 个文件，超出自动淘汰最久未编辑的文件
- **持久化存储优化**：内存缓存 + 防抖写盘（500ms），避免频繁磁盘 I/O
- **IPC 监听器管理**：所有 IPC 监听器精确清理，防止 HMR 或窗口操作导致泄漏
- **CSP 安全策略**：全局 Content-Security-Policy，覆盖主窗口和新开窗口
- **沙盒隔离**：contextIsolation + 禁用 nodeIntegration，渲染进程通过 preload 安全调用主进程

## 快捷键一览

### 文件操作
| 快捷键 | 功能 |
|--------|------|
| `Ctrl+N` | 新建文件 |
| `Ctrl+O` | 打开文件 |
| `Ctrl+Shift+O` | 打开文件夹 |
| `Ctrl+S` | 保存 |
| `Ctrl+Shift+S` | 另存为 |
| `Ctrl+P` | 快速打开 |
| `Ctrl+Shift+P` | 打印 |

### 编辑操作
| 快捷键 | 功能 |
|--------|------|
| `Ctrl+F` | 查找 |
| `Ctrl+H` | 替换 |
| `Ctrl+Shift+F` | 全局搜索 |
| `Alt+Shift+F` | 格式化文档 |

### 段落格式
| 快捷键 | 功能 |
|--------|------|
| `Ctrl+1~6` | 标题 1~6 |
| `Ctrl+Shift+K` | 代码块 |
| `Ctrl+Shift+M` | 数学公式块 |
| `Ctrl+Shift+Q` | 引用 |
| `Ctrl+Shift+[` | 有序列表 |
| `Ctrl+Shift+]` | 无序列表 |
| `Ctrl+T` | 表格 |

### 行内格式
| 快捷键 | 功能 |
|--------|------|
| `Ctrl+B` | 加粗 |
| `Ctrl+I` | 斜体 |
| `Ctrl+U` | 下划线 |
| `Alt+Shift+5` | 删除线 |
| `` Ctrl+Shift+` `` | 行内代码 |
| `Ctrl+K` | 超链接 |
| `Ctrl+Shift+I` | 图片 |

### 视图切换
| 快捷键 | 功能 |
|--------|------|
| `Ctrl+/` | 源码模式 |
| `Ctrl+Shift+L` | 实时预览 |
| `Ctrl+Shift+P` | 预览模式 |
| `Ctrl+Shift+R` | 即时渲染模式（WYSIWYG） |
| `Ctrl+\` | 切换侧边栏 |
| `Ctrl+Shift+=` | 放大 |
| `Ctrl+-` | 缩小 |
| `Ctrl+0` | 重置缩放 |

## 设计原则

1. **Apple HIG 风格**: 遵循 Apple Human Interface Guidelines，毛玻璃、大圆角、系统字体、弹性动效
2. **简洁至上**: 界面简洁，减少干扰，专注写作
3. **性能优先**: 大文件也能流畅编辑和预览
4. **所见即所得**: 尽可能接近最终渲染效果
5. **兼容性**: 完全兼容 GFM 标准 Markdown 语法
6. **可扩展**: 模块化架构，方便后续功能扩展
7. **跨平台一致性**: 三端体验一致

## 许可证

[MIT](LICENSE)
