import { useEffect, useRef } from 'react'
import { useFileStore } from '../stores/fileStore'
import { useVersionStore } from '../stores/versionStore'

/** 自动保存间隔（毫秒） —— 3 秒 */
const AUTO_SAVE_INTERVAL = 3000

/** 版本快照间隔（毫秒） —— 每 5 分钟记录一次 */
const VERSION_SNAPSHOT_INTERVAL = 300000

/**
 * 自动保存 Hook
 * 定时检查文件是否有修改，自动保存
 * 同时定期记录版本快照
 */
export function useAutoSave() {
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const versionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // 自动保存
    saveTimerRef.current = setInterval(() => {
      const { currentFile, saveCurrentFile } = useFileStore.getState()
      if (currentFile.isModified && currentFile.filePath) {
        saveCurrentFile()
        console.log('Auto-saved:', currentFile.filePath)
      }
    }, AUTO_SAVE_INTERVAL)

    // 版本快照
    versionTimerRef.current = setInterval(() => {
      const { currentFile } = useFileStore.getState()
      if (currentFile.filePath && currentFile.content.trim().length > 0) {
        useVersionStore.getState().addVersion(
          currentFile.filePath,
          currentFile.fileName,
          currentFile.content,
        )
        console.log('Version snapshot saved:', currentFile.filePath)
      }
    }, VERSION_SNAPSHOT_INTERVAL)

    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current)
      if (versionTimerRef.current) clearInterval(versionTimerRef.current)
    }
  }, [])
}
