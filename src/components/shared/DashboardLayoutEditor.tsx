import { ArrowDown, ArrowUp, LayoutDashboard, RotateCcw } from 'lucide-react'
import { Button, Switch } from '@/components/ui'
import {
  DASHBOARD_CARDS,
  useDashboardLayout,
  type DashboardCardKey
} from '@/hooks/useDashboardLayout'

/**
 * 仪表盘布局编辑器（V4/O6）：每个区块一行，上移 / 下移调整顺序，Switch 控制显隐。
 * 配置即时生效（localStorage 持久化），仪表盘页不需要刷新。
 */
export function DashboardLayoutEditor() {
  const [layout, setLayout] = useDashboardLayout()

  const move = (key: DashboardCardKey, dir: -1 | 1): void => {
    const order = [...layout.order]
    const i = order.indexOf(key)
    const j = i + dir
    if (i < 0 || j < 0 || j >= order.length) return
    ;[order[i], order[j]] = [order[j], order[i]]
    setLayout({ ...layout, order })
  }

  const toggle = (key: DashboardCardKey, show: boolean): void => {
    const hidden = show ? layout.hidden.filter((k) => k !== key) : [...new Set([...layout.hidden, key])]
    // 全部隐藏等于把仪表盘清空 —— 允许，但没有任何意义，这里守住底线至少留一个
    if (hidden.length >= layout.order.length) return
    setLayout({ ...layout, hidden })
  }

  const reset = (): void => {
    setLayout({ order: DASHBOARD_CARDS.map((c) => c.key), hidden: [] })
  }

  const dirty =
    layout.hidden.length > 0 ||
    layout.order.some((k, i) => k !== DASHBOARD_CARDS[i]?.key)

  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-[12px] font-medium text-t1">仪表盘布局</p>
        {dirty ? (
          <Button size="sm" variant="ghost" icon={<RotateCcw size={12} />} onClick={reset}>
            恢复默认
          </Button>
        ) : null}
      </div>
      <div className="space-y-1.5">
        {layout.order.map((key, i) => {
          const meta = DASHBOARD_CARDS.find((c) => c.key === key)
          if (!meta) return null
          const shown = !layout.hidden.includes(key)
          return (
            <div
              key={key}
              className={`flex items-center gap-2 rounded-xl border border-line bg-bg1/50 px-2.5 py-2 transition-opacity ${
                shown ? '' : 'opacity-50'
              }`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <LayoutDashboard size={13} className="shrink-0 text-t3" />
                <div className="min-w-0">
                  <p className="truncate text-[12px] text-t1">{meta.label}</p>
                  <p className="truncate text-[10.5px] text-t3">{meta.hint}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label="上移"
                  disabled={i === 0}
                  onClick={() => move(key, -1)}
                  className="flex size-6 items-center justify-center rounded-lg text-t3 transition-colors hover:bg-bg3 hover:text-t1 disabled:opacity-30"
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  type="button"
                  aria-label="下移"
                  disabled={i === layout.order.length - 1}
                  onClick={() => move(key, 1)}
                  className="flex size-6 items-center justify-center rounded-lg text-t3 transition-colors hover:bg-bg3 hover:text-t1 disabled:opacity-30"
                >
                  <ArrowDown size={13} />
                </button>
                <Switch checked={shown} onChange={(v) => toggle(key, v)} />
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-t3">
        顺序与显隐立即生效并记住；两张图表相邻时会并排显示，被隔开则各占一行。
      </p>
    </div>
  )
}
