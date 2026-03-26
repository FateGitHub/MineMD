/**
 * 公共类型定义
 * 整个项目共享的类型，避免各处重复定义
 */

/** 文件条目（文件树节点） */
export interface FileEntry {
  /** 文件/文件夹名 */
  name: string
  /** 完整路径 */
  path: string
  /** 是否为目录 */
  isDirectory: boolean
  /** 子项（仅目录有） */
  children?: FileEntry[]
}

/** 字数统计 */
export interface WordCount {
  /** 字符数 */
  characters: number
  /** 单词数 */
  words: number
  /** 行数 */
  lines: number
  /** 段落数 */
  paragraphs: number
}

/** 大纲标题项 */
export interface TocItem {
  /** 标题级别 (1-6) */
  level: number
  /** 标题文本 */
  text: string
  /** 所在行号 */
  line: number
}

/** 编辑器视图模式 */
export type ViewMode = 'source' | 'live' | 'preview' | 'wysiwyg'

/** 主题 */
export type Theme = 'light' | 'dark'

/** 侧边栏标签页 */
export type SidebarTab = 'files' | 'outline'

/** 导出格式 */
export type ExportFormat = 'pdf' | 'html' | 'html-plain'
