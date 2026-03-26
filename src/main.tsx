import React, { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

/**
 * 全局 Error Boundary —— 防止未捕获的渲染错误导致整个应用白屏
 */
class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[MineMD] 应用渲染错误:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#1a1a2e',
          color: '#e0e0e0',
          fontFamily: 'system-ui, sans-serif',
          padding: '40px',
          textAlign: 'center',
        }}>
          <h2 style={{ marginBottom: '16px', color: '#ff6b6b' }}>应用遇到了一个错误</h2>
          <p style={{ marginBottom: '24px', opacity: 0.7 }}>
            {this.state.error?.message || '未知错误'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
            }}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              background: '#4a9eff',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            重新加载
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
)
