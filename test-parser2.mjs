import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import { visit } from 'unist-util-visit'

function rehypeSourceLine() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      const blockTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'blockquote', 'ul', 'ol', 'table', 'hr', 'div']
      if (!blockTags.includes(node.tagName)) return
      if (node.position && node.position.start && node.position.start.line) {
        node.properties = node.properties || {}
        node.properties['dataSourceLine'] = node.position.start.line
      }
    })
  }
}

function preprocessMarkdown(markdown) {
  return markdown.replace(/\n{3,}/g, (match) => {
    const extraLines = match.length - 2
    let result = '\n\n'
    for (let i = 0; i < extraLines; i++) {
      result += '&nbsp;\n\n'
    }
    return result
  })
}

const p = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkBreaks)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeSourceLine)
  .use(rehypeStringify, { allowDangerousHtml: true })

// 原始 md：有连续空行
const md = '# Hello\n\nLine 3\n\n\n\nLine 7\n\nLine 9'
console.log('=== 原始 MD ===')
md.split('\n').forEach((l, i) => console.log(`  ${i+1}: "${l}"`))
console.log('\n=== 预处理后 ===')
const processed = preprocessMarkdown(md)
processed.split('\n').forEach((l, i) => console.log(`  ${i+1}: "${l}"`))
console.log('\n=== HTML 输出 ===')
console.log(String(p.processSync(processed)))
