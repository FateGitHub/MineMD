import type { Extension } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import {
  toggleBold,
  toggleItalic,
  toggleStrikethrough,
  toggleUnderline,
  toggleInlineCode,
  toggleInlineMath,
  toggleHighlight,
  setHeading,
  insertCodeBlock,
  insertMathBlock,
  toggleBlockquote,
  toggleOrderedList,
  toggleUnorderedList,
  toggleTaskList,
  insertTable,
  insertHorizontalRule,
  insertLink,
  insertImage,
  formatDocument,
} from '../commands/markdownCommands'

/**
 * Markdown 编辑器快捷键扩展
 * 与 Typora 的快捷键保持一致
 */
export function markdownKeymap(): Extension {
  return keymap.of([
    // 行内格式
    { key: 'Mod-b', run: toggleBold },
    { key: 'Mod-i', run: toggleItalic },
    { key: 'Mod-u', run: toggleUnderline },
    { key: 'Alt-Shift-5', run: toggleStrikethrough },
    { key: 'Mod-Shift-`', run: toggleInlineCode },
    { key: 'Mod-k', run: insertLink },
    { key: 'Mod-Shift-i', run: insertImage },

    // 标题
    { key: 'Mod-1', run: (view) => setHeading(view, 1) },
    { key: 'Mod-2', run: (view) => setHeading(view, 2) },
    { key: 'Mod-3', run: (view) => setHeading(view, 3) },
    { key: 'Mod-4', run: (view) => setHeading(view, 4) },
    { key: 'Mod-5', run: (view) => setHeading(view, 5) },
    { key: 'Mod-6', run: (view) => setHeading(view, 6) },

    // 块级元素
    { key: 'Mod-Shift-k', run: insertCodeBlock },
    { key: 'Mod-Shift-m', run: insertMathBlock },
    { key: 'Mod-Shift-q', run: toggleBlockquote },
    { key: 'Mod-Shift-[', run: toggleOrderedList },
    { key: 'Mod-Shift-]', run: toggleUnorderedList },
    { key: 'Mod-t', run: insertTable },

    // 格式化文档
    { key: 'Alt-Shift-f', run: formatDocument },
  ])
}
