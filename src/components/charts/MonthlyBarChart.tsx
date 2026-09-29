import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { MonthlyPoint } from '@/types/steam'
import { formatMinutes } from '@/utils/format'
import { useCssVar, tooltipStyle } from './themeColors'
import { EmptyState } from '@/components/ui'

interface MonthlyBarChartProps {
  data: MonthlyPoint[]
  height?: number
}

interface TipProps {
  active?: boolean
  payload?: Array<{ payload: MonthlyPoint }>
}

/**
 * 轴标签格式化。入参约定是原始键，但这里对已格式化过的值也做兜底，
 * 避免出现 `NaN月` 这种把渲染缺陷暴露给用户的标签。
 *   `2026-09` → `9月`   `2026` → `2026年`   其它 → 原样返回
 */
function monthLabel(raw: string): string {
  const m = String(raw ?? '').trim()
  if (/^\d{4}-\d{1,2}$/.test(m)) return `${Number(m.split('-')[1])}月`
  if (/^\d{4}$/.test(m)) return `${m}年`
  return m === '' ? '—' : m
}

export function MonthlyBarChart({ data, height = 280 }: MonthlyBarChartProps) {
  const accent2 = useCssVar('--si-accent-2')
  const axis = useCssVar('--si-axis')
  const grid = useCssVar('--si-grid')
  const line2 = useCssVar('--si-line-2')

  if (data.length === 0) {
    return <EmptyState title="暂无数据" description="还没有月度统计" />
  }

  const CustomTip = ({ active, payload }: TipProps) => {
    if (!active || !payload || payload.length === 0) return null
    const d = payload[0].payload
    return (
      <div style={tooltipStyle()}>
        <div className="text-t3">{monthLabel(d.month)}</div>
        <div className="text-t1 font-medium">{formatMinutes(d.minutes)}</div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={monthLabel}
          tick={{ style: { fill: axis, fontSize: 11 } }}
          axisLine={{ stroke: line2 }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => (v / 60).toFixed(0)}
          tick={{ style: { fill: axis, fontSize: 11 } }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={<CustomTip />} cursor={{ fill: grid, opacity: 0.5 }} />
        <Bar dataKey="minutes" fill={accent2} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  )
}
