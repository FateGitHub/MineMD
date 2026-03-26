import { BrowserWindow, Menu, type MenuItem, type MenuItemConstructorOptions } from 'electron'

/**
 * 创建应用菜单
 */
export function createMenu(mainWindow: BrowserWindow) {
  const isMac = process.platform === 'darwin'

  /** 安全地向渲染进程发送菜单事件 */
  const sendAction = (action: string) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('menu:action', action)
    }
  }

  const template: (MenuItemConstructorOptions | MenuItem)[] = [
    // macOS 应用菜单
    ...(isMac
      ? [
          {
            label: 'MineMD',
            submenu: [
              { role: 'about' as const, label: '关于 MineMD' },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const, label: '隐藏' },
              { role: 'hideOthers' as const, label: '隐藏其他' },
              { role: 'unhide' as const, label: '显示全部' },
              { type: 'separator' as const },
              { role: 'quit' as const, label: '退出' },
            ],
          },
        ]
      : []),

    // 文件菜单
    {
      label: '文件',
      submenu: [
        {
          label: '新建',
          accelerator: 'CmdOrCtrl+N',
          click: () => sendAction('file:new'),
        },
        {
          label: '打开文件...',
          accelerator: 'CmdOrCtrl+O',
          click: () => sendAction('file:open'),
        },
        {
          label: '打开文件夹...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => sendAction('folder:open'),
        },
        { type: 'separator' },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => sendAction('file:save'),
        },
        {
          label: '另存为...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => sendAction('file:saveAs'),
        },
        { type: 'separator' },
        {
          label: '快速打开...',
          accelerator: 'CmdOrCtrl+P',
          click: () => sendAction('quickOpen'),
        },
        { type: 'separator' },
        {
          label: '导出',
          submenu: [
            {
              label: '导出为 PDF',
              click: () => sendAction('export:pdf'),
            },
            {
              label: '导出为 HTML',
              click: () => sendAction('export:html'),
            },
            {
              label: '导出为 HTML（无样式）',
              click: () => sendAction('export:htmlPlain'),
            },
          ],
        },
        { type: 'separator' },
        {
          label: '打印...',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => sendAction('file:print'),
        },
        { type: 'separator' },
        isMac ? { role: 'close', label: '关闭' } : { role: 'quit', label: '退出' },
      ],
    },

    // 编辑菜单
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { type: 'separator' },
        { role: 'selectAll', label: '全选' },
        { type: 'separator' },
        {
          label: '查找',
          accelerator: 'CmdOrCtrl+F',
          click: () => sendAction('edit:find'),
        },
        {
          label: '替换',
          accelerator: 'CmdOrCtrl+H',
          click: () => sendAction('edit:replace'),
        },
        { type: 'separator' },
        {
          label: '在文件夹中搜索...',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => sendAction('globalSearch'),
        },
        { type: 'separator' },
        {
          label: '格式化文档',
          accelerator: 'Alt+Shift+F',
          click: () => sendAction('edit:format'),
        },
        {
          label: '清空内容',
          click: () => sendAction('edit:clear'),
        },
      ],
    },

    // 段落菜单
    {
      label: '段落',
      submenu: [
        {
          label: '标题 1',
          accelerator: 'CmdOrCtrl+1',
          click: () => sendAction('paragraph:h1'),
        },
        {
          label: '标题 2',
          accelerator: 'CmdOrCtrl+2',
          click: () => sendAction('paragraph:h2'),
        },
        {
          label: '标题 3',
          accelerator: 'CmdOrCtrl+3',
          click: () => sendAction('paragraph:h3'),
        },
        {
          label: '标题 4',
          accelerator: 'CmdOrCtrl+4',
          click: () => sendAction('paragraph:h4'),
        },
        {
          label: '标题 5',
          accelerator: 'CmdOrCtrl+5',
          click: () => sendAction('paragraph:h5'),
        },
        {
          label: '标题 6',
          accelerator: 'CmdOrCtrl+6',
          click: () => sendAction('paragraph:h6'),
        },
        { type: 'separator' },
        {
          label: '代码块',
          accelerator: 'CmdOrCtrl+Shift+K',
          click: () => sendAction('paragraph:codeBlock'),
        },
        {
          label: '数学公式块',
          accelerator: 'CmdOrCtrl+Shift+M',
          click: () => sendAction('paragraph:mathBlock'),
        },
        {
          label: '引用',
          accelerator: 'CmdOrCtrl+Shift+Q',
          click: () => sendAction('paragraph:quote'),
        },
        { type: 'separator' },
        {
          label: '有序列表',
          accelerator: 'CmdOrCtrl+Shift+[',
          click: () => sendAction('paragraph:orderedList'),
        },
        {
          label: '无序列表',
          accelerator: 'CmdOrCtrl+Shift+]',
          click: () => sendAction('paragraph:unorderedList'),
        },
        {
          label: '任务列表',
          click: () => sendAction('paragraph:taskList'),
        },
        { type: 'separator' },
        {
          label: '表格',
          accelerator: 'CmdOrCtrl+T',
          click: () => sendAction('paragraph:table'),
        },
        {
          label: '水平线',
          click: () => sendAction('paragraph:hr'),
        },
      ],
    },

    // 格式菜单
    {
      label: '格式',
      submenu: [
        {
          label: '加粗',
          accelerator: 'CmdOrCtrl+B',
          click: () => sendAction('format:bold'),
        },
        {
          label: '斜体',
          accelerator: 'CmdOrCtrl+I',
          click: () => sendAction('format:italic'),
        },
        {
          label: '下划线',
          accelerator: 'CmdOrCtrl+U',
          click: () => sendAction('format:underline'),
        },
        {
          label: '删除线',
          accelerator: 'Alt+Shift+5',
          click: () => sendAction('format:strikethrough'),
        },
        { type: 'separator' },
        {
          label: '行内代码',
          accelerator: 'CmdOrCtrl+Shift+`',
          click: () => sendAction('format:inlineCode'),
        },
        {
          label: '行内公式',
          click: () => sendAction('format:inlineMath'),
        },
        { type: 'separator' },
        {
          label: '超链接',
          accelerator: 'CmdOrCtrl+K',
          click: () => sendAction('format:link'),
        },
        {
          label: '图片',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => sendAction('format:image'),
        },
        { type: 'separator' },
        {
          label: '高亮',
          click: () => sendAction('format:highlight'),
        },
      ],
    },

    // 视图菜单
    {
      label: '视图',
      submenu: [
        {
          label: '切换侧边栏',
          accelerator: 'CmdOrCtrl+\\',
          click: () => sendAction('view:toggleSidebar'),
        },
        {
          label: '大纲',
          accelerator: 'CmdOrCtrl+Shift+1',
          click: () => sendAction('view:outline'),
        },
        { type: 'separator' },
        {
          label: '源码模式',
          accelerator: 'CmdOrCtrl+/',
          click: () => sendAction('view:sourceMode'),
        },
        {
          label: '即时渲染',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => sendAction('view:wysiwygMode'),
        },
        {
          label: '实时预览',
          accelerator: 'CmdOrCtrl+Shift+L',
          click: () => sendAction('view:livePreview'),
        },
        {
          label: '预览模式',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => sendAction('view:previewMode'),
        },
        { type: 'separator' },
        {
          label: '放大',
          accelerator: 'CmdOrCtrl+Shift+=',
          click: () => sendAction('view:zoomIn'),
        },
        {
          label: '缩小',
          accelerator: 'CmdOrCtrl+-',
          click: () => sendAction('view:zoomOut'),
        },
        {
          label: '重置缩放',
          accelerator: 'CmdOrCtrl+0',
          click: () => sendAction('view:zoomReset'),
        },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
        { role: 'toggleDevTools', label: '开发者工具' },
      ],
    },

    // 主题菜单
    {
      label: '主题',
      submenu: [
        {
          label: '亮色主题',
          click: () => sendAction('theme:light'),
        },
        {
          label: '暗色主题',
          click: () => sendAction('theme:dark'),
        },
      ],
    },

    // 版本菜单
    {
      label: '版本',
      submenu: [
        {
          label: '版本历史...',
          click: () => sendAction('versionHistory'),
        },
      ],
    },

    // 帮助菜单
    {
      label: '帮助',
      submenu: [
        {
          label: '关于 MineMD',
          click: () => sendAction('help:about'),
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
