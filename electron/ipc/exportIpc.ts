import { ipcMain, BrowserWindow } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

/**
 * 注册导出相关的 IPC 处理器
 */
export function registerExportIpc() {
  // 导出为 PDF
  ipcMain.handle('export:pdf', async (_event, filePath: string) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null

    try {
      const pdfData = await win.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        landscape: false,
      })

      await fs.promises.writeFile(filePath, pdfData)
      return filePath
    } catch (error) {
      console.error('Failed to export PDF:', error)
      throw error
    }
  })

  // 导出为 HTML（完整带样式）
  ipcMain.handle('export:html', async (_event, filePath: string, htmlContent: string, cssContent: string) => {
    try {
      const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${path.basename(filePath, path.extname(filePath))}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <style>
    body {
      max-width: 860px;
      margin: 0 auto;
      padding: 30px 60px;
      font-family: 'Open Sans', 'Clear Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #333;
    }
    ${cssContent || ''}
  </style>
</head>
<body class="markdown-body">
  ${htmlContent}
</body>
</html>`

      await fs.promises.writeFile(filePath, fullHtml, 'utf-8')
      return filePath
    } catch (error) {
      console.error('Failed to export HTML:', error)
      throw error
    }
  })

  // 导出为纯 HTML（无样式）
  ipcMain.handle('export:htmlPlain', async (_event, filePath: string, htmlContent: string) => {
    try {
      const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${path.basename(filePath, path.extname(filePath))}</title>
</head>
<body>
  ${htmlContent}
</body>
</html>`

      await fs.promises.writeFile(filePath, fullHtml, 'utf-8')
      return filePath
    } catch (error) {
      console.error('Failed to export plain HTML:', error)
      throw error
    }
  })
}
