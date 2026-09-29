import { createRoot } from 'react-dom/client'
import App from '@/App'
import '@/styles/global.css'

// 刻意不使用 StrictMode：它会双调用 effect，导致首次挂载时重复触发数据同步与通知判定。
const container = document.getElementById('root')
if (!container) {
  throw new Error('找不到 #root 挂载点')
}

createRoot(container).render(<App />)
