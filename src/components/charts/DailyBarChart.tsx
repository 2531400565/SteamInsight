import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { DayPlaytime } from '@/types/steam'
import { formatMinutes } from '@/utils/format'
import { useCssVar, tooltipStyle } from './themeColors'
import { EmptyState } from '@/components/ui'

interface DailyBarChartProps {
  data: DayPlaytime[]
  height?: number
  showAxis?: boolean
}

interface TipProps {
  active?: boolean
  payload?: Array<{ payload: DayPlaytime }>
}

function shortDate(d: string): string {
  const parts = d.split('-')
  return `${Number(parts[1])}/${Number(parts[2])}`
}

export function DailyBarChart({ data, height = 280, showAxis = true }: DailyBarChartProps) {
  const accent2 = useCssVar('--si-accent-2')
  const axis = useCssVar('--si-axis')
  const grid = useCssVar('--si-grid')
  const line2 = useCssVar('--si-line-2')

  if (data.length === 0) {
    return <EmptyState title="暂无数据" description="这段时间内没有游玩记录" />
  }

  const CustomTip = ({ active, payload }: TipProps) => {
    if (!active || !payload || payload.length === 0) return null
    const d = payload[0].payload
    return (
      <div style={tooltipStyle()}>
        <div className="text-t3">{d.date}</div>
        <div className="text-t1 font-medium">{formatMinutes(d.minutes)}</div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: showAxis ? -16 : 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          tick={{ style: { fill: axis, fontSize: 11 } }}
          axisLine={{ stroke: line2 }}
          tickLine={false}
          interval="preserveStartEnd"
          hide={!showAxis}
        />
        <YAxis
          tickFormatter={(v: number) => (v / 60).toFixed(0)}
          tick={{ style: { fill: axis, fontSize: 11 } }}
          axisLine={false}
          tickLine={false}
          width={40}
          hide={!showAxis}
        />
        <Tooltip content={<CustomTip />} cursor={{ fill: grid, opacity: 0.5 }} />
        <Bar dataKey="minutes" fill={accent2} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}
