import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { formatMinutes } from '@/utils/format'
import { useCssVar, tooltipStyle } from './themeColors'
import { EmptyState } from '@/components/ui'
import { RangeTabs, useChartRange, useRangedByDate } from './RangeTabs'

interface TrendPoint {
  date: string
  minutes: number
  avg7: number
}

interface TrendLineChartProps {
  data: TrendPoint[]
  height?: number
  /** O-6：打开「30 / 90 / 全部」切换。key 用于分别记住每张图的档位。 */
  rangeKey?: string
}

interface TipProps {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string }>
  label?: string
}

function shortDate(d: string): string {
  const parts = d.split('-')
  return `${Number(parts[1])}/${Number(parts[2])}`
}

const byDate = (p: TrendPoint): string => p.date

export function TrendLineChart({ data, height = 280, rangeKey }: TrendLineChartProps) {
  const accent = useCssVar('--si-accent')
  const accent2 = useCssVar('--si-accent-2')
  const axis = useCssVar('--si-axis')
  const grid = useCssVar('--si-grid')
  const line2 = useCssVar('--si-line-2')
  const [days, setDays] = useChartRange(rangeKey ?? 'trend', 30)
  const shown = useRangedByDate(data, rangeKey ? days : 0, byDate)

  if (data.length === 0) {
    return <EmptyState title="暂无数据" description="这段时间内没有游玩记录" />
  }

  const busiest = shown.reduce<TrendPoint | null>((m, p) => (m === null || p.minutes > m.minutes ? p : m), null)

  const CustomTip = ({ active, payload, label }: TipProps) => {
    if (!active || !payload || payload.length === 0) return null
    return (
      <div style={tooltipStyle()}>
        <div className="text-t3 mb-0.5">{label}</div>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-t2">{p.name}</span>
            <span className="text-t1 font-medium ml-auto">{formatMinutes(p.value ?? 0)}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {rangeKey ? (
        <RangeTabs value={days} onChange={setDays} shownCount={shown.length} totalCount={data.length} />
      ) : null}
      {/* O-4：趋势图的数据完全在 SVG 里，读屏读不到。这里用纯文本先给结论。 */}
      <p className="sr-only">
        共 {shown.length} 天记录，累计 {formatMinutes(shown.reduce((n, p) => n + p.minutes, 0))}，
        单日最长 {formatMinutes(shown.reduce((m, p) => Math.max(m, p.minutes), 0))}
        {busiest ? `，最投入的一天是 ${busiest.date}，${formatMinutes(busiest.minutes)}` : ''}
      </p>
      {shown.length === 0 ? (
        <EmptyState title="这段时间内没有游玩记录" description="把范围切到「全部」可以看到更早的记录" />
      ) : (
        <ResponsiveContainer width="100%" height={height} aria-hidden="true">
          <ComposedChart data={shown} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                <stop offset="100%" stopColor={accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
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
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--si-t2)' }} />
            <Area
              type="monotone"
              dataKey="minutes"
              name="每日时长"
              stroke={accent}
              strokeWidth={2}
              fill="url(#trendFill)"
              dot={false}
              activeDot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="avg7"
              name="7日均线"
              stroke={accent2}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
