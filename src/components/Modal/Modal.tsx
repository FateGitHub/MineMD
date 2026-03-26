import { useEffect, useRef } from 'react'

interface ModalProps {
  /** 是否可见 */
  visible: boolean
  /** 标题 */
  title: string
  /** 关闭回调 */
  onClose: () => void
  /** 子内容 */
  children: React.ReactNode
  /** 宽度 */
  width?: number
}

/**
 * 通用弹窗组件 —— Apple HIG 风格
 */
function Modal({ visible, title, onClose, children, width = 480 }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (visible) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div
      ref={overlayRef}
      className="quick-open-overlay"
      style={{ alignItems: 'center', paddingTop: 0 }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div
        style={{
          width,
          background: 'var(--editor-bg)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--editor-border)',
          overflow: 'hidden',
          animation: 'panel-in var(--duration-normal) var(--ease-spring)',
        }}
      >
        {/* 标题栏 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--editor-border)',
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--editor-text)',
            margin: 0,
          }}>{title}</h3>
          <button
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--editor-text-secondary)',
              cursor: 'pointer',
              fontSize: '16px',
              lineHeight: 1,
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
              transition: 'background 0.15s',
            }}
            onClick={onClose}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--editor-hover)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
          >
            ✕
          </button>
        </div>
        {/* 内容 */}
        <div style={{ padding: '16px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal
