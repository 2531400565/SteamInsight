import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useCssVar, tooltipStyle } from './themeColors'
import { EmptyState } from '@/components/ui'

interface AchievementTrendPoint {
  /** 月份原始键（YYYY-MM），短标签由图表格式化 —— 不要提前格式化 */
  month: string
  /** 截至该月累计解锁的成就数 */
  count: number
}

interface AchievementTrendChartProps {
  data: AchievementTrendPoint[]
  height?: number
}

export type { AchievementTrendPoint }

/** 把 `2025-07` 渲染成 `25/07`，月份多了也不挤。 */
function shortMonth(m: string): string {
  const parts = m.split('-')
  return `${parts[0].slice(2)}/${Number(parts[1])}`
}

/**
 * 成就完成度趋势（V4 / F-5）：按月聚合 `achievements.unlocked_at` 的**累计**解锁数。
 *
 * 为什么单独建组件而不是复用 TrendLineChart：后者是「时长」语义（分钟 / 7 日移动平均，
 * tooltip 写死「小时」），塞成就数进去会出现「7 月解锁了 120 小时」这种笑话。
 */
export function AchievementTrendChart({ data, height = 220 }: AchievementTrendChartProps) {
  const accent = useCssVar('--si-accent')
  const accent2 = useCssVar('--si-accent-2')
  const axis = useCssVar('--si-axis')
  const grid = useCssVar('--si-grid')

  if (data.length === 0) {
    return <EmptyState title="还没有成就解锁记录" description="成就的解锁时间只在真实同步时写入；再同步一次即可点亮这条曲线。" />
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={shortMonth}
          stroke={axis}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          minTickGap={22}
        />
        <YAxis stroke={axis} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={46} />
        <Tooltip
          contentStyle={tooltipStyle()}
          formatter={(value) => [`${value} 个`, '累计解锁']}
          labelFormatter={(label) => `${label} 月`}
        />
        <Line
          type="monotone"
          dataKey="count"
          name="累计解锁"
          stroke={accent}
          strokeWidth={2}
          dot={{ r: 2, fill: accent2, strokeWidth: 0 }}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
