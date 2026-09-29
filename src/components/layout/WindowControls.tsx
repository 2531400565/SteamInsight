import { useEffect, useState } from 'react'
import { Copy, Minus, Square, X } from 'lucide-react'
import { bridge } from '@/services/bridge'

/**
 * 自绘窗口按钮（主窗口是 frame:false）。
 * 最大化状态以主进程广播为准，避免本地猜测与实际不一致。
 */
export function WindowControls() {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    let alive = true
    void bridge.window.isMaximized().then((value) => {
      if (alive) setMaximized(value)
    })
    const off = bridge.window.onMaximizedChange((value) => setMaximized(value))
    return () => {
      alive = false
      off()
    }
  }, [])

  const base =
    'no-drag flex h-8 w-[46px] items-center justify-center text-t2 transition-colors duration-150'

  return (
    <div className="flex items-center">
      <button type="button" aria-label="最小化" title="最小化" className={`${base} hover:bg-bg4 hover:text-t1`} onClick={() => bridge.window.minimize()}>
        <Minus size={15} />
      </button>
      <button
        type="button"
        aria-label={maximized ? '还原' : '最大化'}
        title={maximized ? '还原' : '最大化'}
        className={`${base} hover:bg-bg4 hover:text-t1`}
        onClick={() => bridge.window.toggleMaximize()}
      >
        {maximized ? <Copy size={13} /> : <Square size={12} />}
      </button>
      <button
        type="button"
        aria-label="关闭"
        title="关闭"
        className={`${base} hover:bg-danger hover:text-white`}
        onClick={() => bridge.window.close()}
      >
        <X size={16} />
      </button>
    </div>
  )
}
