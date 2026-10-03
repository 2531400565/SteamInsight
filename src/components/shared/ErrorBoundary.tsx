import { Component, type ErrorInfo, type ReactNode } from 'react'
import { CircleAlert, Copy, RefreshCw, TriangleAlert } from 'lucide-react'

interface Props {
  children: ReactNode
  /** 页面级边界：出错时只替换这块内容；应用级：替换整个界面 */
  variant?: 'app' | 'section'
}

interface State {
  error: Error | null
  info: string
}

/**
 * 渲染层错误边界。
 *
 * 没有它的时候，任何一个页面渲染抛错都会让整窗白屏 —— 用户看到的是一个空窗口，
 * 既不知道发生了什么，也没法把信息反馈给开发者，只能杀进程重开（未保存的笔记等一并丢）。
 *
 * 这里做三件事：
 *  1. 把错误拦在当前区域，给出「是什么错、在哪一层」的可读信息；
 *  2. 提供「重新加载」（多数渲染错误重载即恢复）与「复制错误信息」（方便用户发给我排查）；
 *  3. 错误原文 + 组件栈写进控制台，诊断包导出时能带上（配合主进程已有的日志系统）。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: '' }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ info: info.componentStack ?? '' })
    // 控制台留一份：主进程的诊断包会收集渲染层控制台输出
    console.error('[渲染层异常]', error, info.componentStack)
  }

  private reload = (): void => { window.location.reload() }

  private copy = async (): Promise<void> => {
    const text = [
      `错误：${this.state.error?.name ?? 'Error'}: ${this.state.error?.message ?? ''}`,
      `时间：${new Date().toLocaleString('zh-CN')}`,
      `组件栈：\n${this.state.info || '（无）'}`
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // 剪贴板不可用时退回选中，让用户自己复制
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
  }

  render(): ReactNode {
    const { error, info } = this.state
    if (!error) return this.props.children
    const appLevel = this.props.variant !== 'section'

    return (
      <div className={appLevel ? 'flex h-full items-center justify-center p-6' : 'p-4'}>
        <div className={`w-full ${appLevel ? 'max-w-[520px]' : 'max-w-full'} rounded-2xl border border-danger/40 bg-bg1/70 p-5`}>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-danger">
              {appLevel ? <CircleAlert size={20} /> : <TriangleAlert size={18} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-t1">这个界面出了点问题</p>
              <p className="mt-1 text-[12px] leading-relaxed text-t2">
                {appLevel
                  ? '数据没有损坏，只是这个界面没能正常显示。点「重新加载」通常就能恢复。'
                  : '这一块内容没能正常显示，其余部分不受影响。'}
              </p>

              <pre className="mt-3 max-h-40 overflow-auto rounded-lg border border-line bg-bg2/70 p-2.5 text-[11px] leading-relaxed text-t3">
                {error.name}: {error.message}
                {info ? `\n${info.trim().split('\n').slice(0, 6).join('\n')}` : ''}
              </pre>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={this.reload}
                  className="flex items-center gap-1.5 rounded-pill bg-accent px-3.5 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90"
                >
                  <RefreshCw size={13} />
                  重新加载
                </button>
                <button
                  type="button"
                  onClick={() => void this.copy()}
                  className="flex items-center gap-1.5 rounded-pill border border-line2 px-3.5 py-1.5 text-[12px] text-t2 transition-colors hover:border-line3 hover:text-t1"
                >
                  <Copy size={13} />
                  复制错误信息
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
