import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import { visit } from 'unist-util-visit'

function rehypeSourceLine(lineMap) {
  return () => (tree) => {
    visit(tree, 'element', (node) => {
      const blockTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'blockquote', 'ul', 'ol', 'table', 'hr', 'div']
      if (!blockTags.includes(node.tagName)) return
      if (node.position?.start?.line) {
        const processedLine = node.position.start.line
        const originalLine = processedLine <= lineMap.length ? lineMap[processedLine - 1] : processedLine
        node.properties = node.properties || {}
        node.properties['dataSourceLine'] = originalLine
      }
    })
  }
}

const md = `# Hello

Paragraph 1

## World`

const origLines = md.split('\n')
const lineMap = origLines.map((_, i) => i + 1)

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkBreaks)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeSourceLine(lineMap))
  .use(rehypeStringify, { allowDangerousHtml: true })

const result = processor.processSync(md)
const html = String(result)
console.log('=== HTML Output ===')
console.log(html)

// 检查属性名格式
console.log('\n=== Attribute check ===')
console.log('Has data-source-line:', html.includes('data-source-line'))
console.log('Has datasourceline:', html.includes('datasourceline'))
console.log('Has dataSourceLine:', html.includes('dataSourceLine'))
console.log('Has data-sourceline:', html.includes('data-sourceline'))
