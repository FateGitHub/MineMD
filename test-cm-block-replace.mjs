/**
 * 测试 CodeMirror 6 的 block replace decoration 在多行范围上的行为
 * 验证假设：被替换的多行范围中，后续行的 .cm-line 容器是否仍然占据空间
 */
import { EditorState } from '@codemirror/state'
import { EditorView, Decoration, WidgetType } from '@codemirror/view'
import { StateField } from '@codemirror/state'
import { JSDOM } from 'jsdom'

// 由于 CodeMirror 需要真实 DOM，这个测试无法在 Node.js 中运行
// 改为打印相关的 CodeMirror 源码逻辑

console.log('=== CodeMirror 6 Block Replace 多行行为分析 ===')
console.log('')
console.log('问题：Decoration.replace({ block: true }) 替换多行范围时，')
console.log('被替换行的 .cm-line 容器是否仍存在于 DOM 中？')
console.log('')

// 让我读取 CodeMirror 源码中 block replace 的关键逻辑
import { readFileSync } from 'fs'

const src = readFileSync('./node_modules/@codemirror/view/dist/index.js', 'utf8')

// 查找 "buildText" 或 content builder 相关逻辑
const lines = src.split('\n')

// 搜索 block widget 在 DOM 中的表现
const keywords = ['widgetLineBreaks', 'BlockView', 'block.*replace', 'cm-gap']
for (const kw of keywords) {
  const regex = new RegExp(kw, 'i')
  let found = false
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      if (!found) {
        console.log(`\n--- 关键字: ${kw} ---`)
        found = true
      }
      const start = Math.max(0, i - 2)
      const end = Math.min(lines.length, i + 3)
      for (let j = start; j < end; j++) {
        console.log(`  ${j + 1}: ${lines[j].slice(0, 120)}`)
      }
      console.log('  ...')
    }
  }
}
