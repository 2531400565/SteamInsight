import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMinutes } from '@/utils/format'
import { useCssVar, tooltipStyle } from './themeColors'
import { EmptyState } from '@/components/ui'

interface HourPoint {
  hour: number
  minutes: number
}

interface HourBarChartProps {
  data: HourPoint[]
  height?: number
}

interface TipProps {
  active?: boolean
  payload?: Array<{ payload: HourPoint }>
}

export function HourBarChart({ data, height = 280 }: HourBarChartProps) {
  const accent2 = useCssVar('--si-accent-2')
  const axis = useCssVar('--si-axis')
  const grid = useCssVar('--si-grid')
  const line2 = useCssVar('--si-line-2')

  if (data.length === 0) {
    return <EmptyState title="暂无数据" description="还没有时段分布" />
  }

  const CustomTip = ({ active, payload }: TipProps) => {
    if (!active || !payload || payload.length === 0) return null
    const d = payload[0].payload
    return (
      <div style={tooltipStyle()}>
        <div className="text-t3">{d.hour}时</div>
        <div className="text-t1 font-medium">{formatMinutes(d.minutes)}</div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
        <XAxis
          dataKey="hour"
          tickFormatter={(v: number) => `${v}时`}
          tick={{ style: { fill: axis, fontSize: 11 } }}
          axisLine={{ stroke: line2 }}
          tickLine={false}
          interval={2}
        />
        <YAxis
          tickFormatter={(v: number) => (v / 60).toFixed(0)}
          tick={{ style: { fill: axis, fontSize: 11 } }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={<CustomTip />} cursor={{ fill: grid, opacity: 0.5 }} />
        <Bar dataKey="minutes" fill={accent2} radius={[3, 3, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  )
}
