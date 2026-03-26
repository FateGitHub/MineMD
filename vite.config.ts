import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import electronRenderer from 'vite-plugin-electron-renderer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ES Module 中没有 __dirname，需要手动构造
const __filename_esm = fileURLToPath(import.meta.url)
const __dirname_esm = path.dirname(__filename_esm)

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // 主进程入口 —— 使用默认的 ESM 格式（与 package.json "type":"module" 一致）
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
      {
        // 预加载脚本
        // 重要：Electron 沙盒化的 preload 脚本不支持 ESM，必须编译为 CJS。
        // 通过禁用 vite-plugin-electron 的默认 lib 模式，改用 rollupOptions 控制输出格式。
        entry: 'electron/preload.ts',
        onstart(args) {
          args.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            lib: false as any,
            rollupOptions: {
              input: 'electron/preload.ts',
              external: ['electron'],
              output: {
                format: 'cjs',
                entryFileNames: 'preload.cjs',
              },
            },
          },
        },
      },
    ]),
    electronRenderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname_esm, 'src'),
    },
  },
})
