import { useRef, useState, type ReactNode } from 'react'
import { toPng } from 'html-to-image'
import { Download, Image as ImageIcon } from 'lucide-react'
import { Card, SectionHeader } from '@/components/ui'

interface ChartCardProps {
  title: string
  subtitle?: string
  action?: ReactNode
  icon?: ReactNode
  children: ReactNode
  height?: number
  className?: string
  /** V4 / O-4：是否显示「导出 PNG」按钮（默认开） */
  exportable?: boolean
}

/**
 * 图表卡片（V4 / O-4）。
 *
 * 以前它是死代码（页面全是「Card + SectionHeader + 图」三件套手写），现在把三件套收进来，
 * 顺带提供「导出 PNG」：把图表节点用 html-to-image 转成图片并触发下载。
 *
 * 为什么用 html-to-image 而不是 Recharts 自己的 `chartContainer.download`：
 * Recharts 没有稳定公开的导出 API，而图表颜色全部经 CSS 变量注入，
 * html-to-image 克隆 DOM 时会把计算样式内联进去，主题色随 `data-theme` 一起带过去。
 */
export function ChartCard({ title, subtitle, action, icon, children, height = 280, className = '', exportable = true }: ChartCardProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  const exportPng = async (): Promise<void> => {
    const node = bodyRef.current
    if (!node || exporting) return
    setExporting(true)
    try {
      const dataUrl = await toPng(node, {
        backgroundColor: 'transparent',
        pixelRatio: 2,
        // 过滤掉空状态 / 加载占位以外的交互元素不需要 —— 图表本身无按钮
        cacheBust: true
      })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${title.replace(/[\\/:*?"<>|]/g, '')}.png`
      a.click()
    } finally {
      setExporting(false)
    }
  }

  return (
    <Card className={className}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        action={
          <>
            {action}
            {exportable ? (
              <button
                type="button"
                onClick={() => void exportPng()}
                disabled={exporting}
                title={exporting ? '正在生成图片…' : '导出为 PNG 图片'}
                aria-label={`导出「${title}」为 PNG`}
                className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11.5px] text-t3 transition-colors hover:bg-bg3 hover:text-t1 disabled:opacity-50"
              >
                {exporting ? <ImageIcon size={13} className="spin" /> : <Download size={13} />}
                PNG
              </button>
            ) : null}
          </>
        }
        className="mb-3"
      />
      <div ref={bodyRef} style={{ height }}>
        {children}
      </div>
    </Card>
  )
}
