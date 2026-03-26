import { markdownToHtml } from '../editor/markdown/parser'

/**
 * 导出工具函数
 */

/** 导出为 PDF */
export async function exportToPdf(content: string, defaultFileName: string): Promise<void> {
  try {
    const result = await window.electronAPI.showSaveDialog({
      defaultPath: defaultFileName.replace(/\.md$/, '.pdf'),
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })

    if (result.canceled || !result.filePath) return

    // PDF 导出需要先将内容渲染到页面，然后通过 Electron 的 printToPDF 导出
    await window.electronAPI.exportPdf(result.filePath)
    await window.electronAPI.showMessageBox({
      type: 'info',
      title: '导出成功',
      message: `已导出到：${result.filePath}`,
    })
  } catch (error) {
    console.error('Export PDF failed:', error)
    await window.electronAPI.showMessageBox({
      type: 'error',
      title: '导出失败',
      message: '导出 PDF 失败，请重试。',
    })
  }
}

/** 导出为 HTML（带样式） */
export async function exportToHtml(content: string, defaultFileName: string): Promise<void> {
  try {
    const html = await markdownToHtml(content)
    const result = await window.electronAPI.showSaveDialog({
      defaultPath: defaultFileName.replace(/\.md$/, '.html'),
      filters: [{ name: 'HTML', extensions: ['html', 'htm'] }],
    })

    if (result.canceled || !result.filePath) return

    // 获取 markdown-body 样式
    const css = getMarkdownBodyStyles()

    await window.electronAPI.exportHtml(result.filePath, html, css)
    await window.electronAPI.showMessageBox({
      type: 'info',
      title: '导出成功',
      message: `已导出到：${result.filePath}`,
    })
  } catch (error) {
    console.error('Export HTML failed:', error)
    await window.electronAPI.showMessageBox({
      type: 'error',
      title: '导出失败',
      message: '导出 HTML 失败，请重试。',
    })
  }
}

/** 导出为纯 HTML（无样式） */
export async function exportToHtmlPlain(content: string, defaultFileName: string): Promise<void> {
  try {
    const html = await markdownToHtml(content)
    const result = await window.electronAPI.showSaveDialog({
      defaultPath: defaultFileName.replace(/\.md$/, '.html'),
      filters: [{ name: 'HTML', extensions: ['html', 'htm'] }],
    })

    if (result.canceled || !result.filePath) return

    await window.electronAPI.exportHtmlPlain(result.filePath, html)
    await window.electronAPI.showMessageBox({
      type: 'info',
      title: '导出成功',
      message: `已导出到：${result.filePath}`,
    })
  } catch (error) {
    console.error('Export plain HTML failed:', error)
  }
}

/** 打印当前文档 */
export async function printDocument(): Promise<void> {
  try {
    await window.electronAPI.printPage()
  } catch (error) {
    console.error('Print failed:', error)
    await window.electronAPI.showMessageBox({
      type: 'error',
      title: '打印失败',
      message: '打印失败，请重试。',
    })
  }
}

/**
 * 提取 markdown-body 相关 CSS 样式
 */
function getMarkdownBodyStyles(): string {
  return `
    h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }
    h1 { font-size: 2em; font-weight: 700; padding-bottom: 0.3em; border-bottom: 1px solid #eaecef; }
    h2 { font-size: 1.5em; padding-bottom: 0.25em; border-bottom: 1px solid #eaecef; }
    h3 { font-size: 1.25em; }
    p { margin-top: 0; margin-bottom: 16px; }
    a { color: #4183c4; text-decoration: none; }
    strong { font-weight: 600; }
    code { background: #f6f8fa; color: #e96900; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 0.9em; }
    pre { background: #f6f8fa; border-radius: 6px; padding: 16px; overflow-x: auto; margin: 16px 0; }
    pre code { background: transparent; color: #333; padding: 0; }
    blockquote { margin: 16px 0; padding: 0 1em; color: #6a737d; border-left: 4px solid #dfe2e5; }
    ul, ol { padding-left: 2em; margin-bottom: 16px; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { padding: 8px 16px; border: 1px solid #dfe2e5; }
    th { font-weight: 600; background: #f6f8fa; }
    hr { height: 2px; padding: 0; margin: 24px 0; background: #e8e8e8; border: 0; }
    img { max-width: 100%; }
    mark { background: #fff3aa; padding: 2px 4px; }
  `
}
