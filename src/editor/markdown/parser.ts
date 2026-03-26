import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkBreaks from 'remark-breaks'
import remarkRehype from 'remark-rehype'
import rehypeKatex from 'rehype-katex'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import type { Root, Element } from 'hast'
import { visit } from 'unist-util-visit'

/**
 * 预处理结果：包含预处理后的文本和行号映射表
 */
interface PreprocessResult {
  /** 预处理后的 Markdown 文本 */
  text: string
  /** 行号映射表：processedLine -> originalLine（1-based）*/
  lineMap: number[]
}

/**
 * 预处理 Markdown 文本：
 * 将连续的空行保留为可见的空白段落（类似 Typora 的行为）。
 * 同时构建行号映射表，将预处理后的行号映射回原始行号。
 */
function preprocessMarkdown(markdown: string): PreprocessResult {
  const origLines = markdown.split('\n')
  const resultLines: string[] = []
  // lineMap[i] = 预处理后第 (i+1) 行对应的原始行号（1-based）
  const lineMap: number[] = []

  let i = 0
  while (i < origLines.length) {
    // 检查从当前行开始是否有连续空行
    if (origLines[i].trim() === '' && i > 0) {
      // 统计连续空行数量
      let emptyCount = 0
      const emptyStart = i
      while (i < origLines.length && origLines[i].trim() === '') {
        emptyCount++
        i++
      }

      if (emptyCount <= 1) {
        // 单个空行：保持不变
        resultLines.push('')
        lineMap.push(emptyStart + 1) // 1-based
      } else {
        // 多个连续空行：第1个空行保留为正常段落分隔，多余的每个空行转为 &nbsp; 段落
        resultLines.push('') // 第1个空行
        lineMap.push(emptyStart + 1)
        for (let j = 1; j < emptyCount; j++) {
          resultLines.push('&nbsp;')
          lineMap.push(emptyStart + j + 1) // 映射到对应的原始空行
          resultLines.push('')
          lineMap.push(emptyStart + j + 1)
        }
      }
    } else {
      resultLines.push(origLines[i])
      lineMap.push(i + 1) // 1-based
      i++
    }
  }

  return {
    text: resultLines.join('\n'),
    lineMap,
  }
}

/**
 * rehype 插件：为块级 HTML 元素注入 data-source-line 属性
 * 使用行号映射表将预处理后的行号转换回原始 Markdown 行号。
 */
function rehypeSourceLine(lineMap: number[]) {
  return () => (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      // 只标记块级元素
      const blockTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'blockquote', 'ul', 'ol', 'table', 'hr', 'div']
      if (!blockTags.includes(node.tagName)) return

      if (node.position?.start?.line) {
        const processedLine = node.position.start.line
        // 映射回原始行号（lineMap 是 0-based 数组，行号是 1-based）
        const originalLine = processedLine <= lineMap.length
          ? lineMap[processedLine - 1]
          : processedLine
        node.properties = node.properties || {}
        node.properties['dataSourceLine'] = originalLine
      }
    })
  }
}

/**
 * 创建 Markdown 解析器
 * 每次解析需要传入新的行号映射表，因此 processor 不能是静态单例。
 * 但 remark/rehype 的各种插件初始化非常轻量，对性能影响可忽略。
 */
function createProcessor(lineMap: number[]) {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkBreaks)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSourceLine(lineMap))
    .use(rehypeSlug)
    .use(rehypeKatex)
    .use(rehypeStringify, { allowDangerousHtml: true })
}

/**
 * 将 Markdown 文本解析为 HTML
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  const { text, lineMap } = preprocessMarkdown(markdown)
  const processor = createProcessor(lineMap)
  const result = await processor.process(text)
  return String(result)
}

/**
 * 同步版本：将 Markdown 文本解析为 HTML
 * 包含错误保护，解析失败时返回纯文本
 */
export function markdownToHtmlSync(markdownInput: string): string {
  try {
    const { text, lineMap } = preprocessMarkdown(markdownInput)
    const processor = createProcessor(lineMap)
    const result = processor.processSync(text)
    return String(result)
  } catch (err) {
    console.warn('[markdownToHtmlSync] 解析失败，回退到纯文本:', err)
    // 解析失败时返回经过 HTML 转义的纯文本
    return `<p>${markdownInput
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>')
    }</p>`
  }
}
