import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot
} from 'recharts'
import type { PricePoint } from '@/types/steam'
import { formatMoney, formatDate } from '@/utils/format'
import { useCssVar, tooltipStyle } from './themeColors'
import { EmptyState } from '@/components/ui'
import { RangeTabs, useChartRange, useRangedBySeconds } from './RangeTabs'

interface PriceLineChartProps {
  data: PricePoint[]
  height?: number
  currentCents?: number
  /** O-6：打开「30 / 90 / 全部」切换。key 用于分别记住每张图的档位。 */
  rangeKey?: string
}

interface TipProps {
  active?: boolean
  payload?: Array<{ payload: PricePoint }>
}

const byCapturedAt = (p: PricePoint): number => p.capturedAt

export function PriceLineChart({ data, height = 280, currentCents, rangeKey }: PriceLineChartProps) {
  const accent = useCssVar('--si-accent')
  const axis = useCssVar('--si-axis')
  const grid = useCssVar('--si-grid')
  const line2 = useCssVar('--si-line-2')
  const warn = useCssVar('--si-warn')
  const [days, setDays] = useChartRange(rangeKey ?? 'price', 30)
  const shown = useRangedBySeconds(data, rangeKey ? days : 0, byCapturedAt)

  if (data.length === 0) {
    return <EmptyState title="暂无数据" description="还没有价格记录" />
  }

  const min = shown.reduce((m, p) => (p.priceCents < m.priceCents ? p : m), shown[0])

  const CustomTip = ({ active, payload }: TipProps) => {
    if (!active || !payload || payload.length === 0) return null
    const p = payload[0].payload
    return (
      <div style={tooltipStyle()}>
        <div className="text-t3">{formatDate(p.capturedAt)}</div>
        <div className="text-t1 font-medium">{formatMoney(p.priceCents)}</div>
        {p.isHistoricalLow && <div className="text-ok">史低</div>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {rangeKey ? (
        <RangeTabs value={days} onChange={setDays} shownCount={shown.length} totalCount={data.length} />
      ) : null}
      {/* O-4：折线在 SVG 里，读屏软件读不到任何数字。用一段纯文本把结论先说清楚，
          图形本身才是给眼睛看的 —— 所以整个图容器标 aria-hidden。 */}
      <p className="sr-only">
        价格走势共 {shown.length} 个采样点，区间 {formatDate(shown[0].capturedAt)} 至 {formatDate(shown[shown.length - 1].capturedAt)}，
        本机最低 {formatMoney(min.priceCents)}
        {currentCents != null ? `，当前 ${formatMoney(currentCents)}` : ''}
      </p>
      {shown.length === 0 ? (
        <EmptyState title="这段时间没有采样" description="把范围切到「全部」可以看到更早期的价格记录" />
      ) : (
        <ResponsiveContainer width="100%" height={height} aria-hidden="true">
          <LineChart data={shown} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
            <XAxis
              dataKey="capturedAt"
              type="number"
              domain={['dataMin', 'dataMax']}
              scale="time"
              tickFormatter={(t: number) => formatDate(t)}
              tick={{ style: { fill: axis, fontSize: 11 } }}
              axisLine={{ stroke: line2 }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => formatMoney(v)}
              tick={{ style: { fill: axis, fontSize: 11 } }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip content={<CustomTip />} cursor={{ fill: grid, opacity: 0.5 }} />
            {currentCents != null && <ReferenceLine y={currentCents} stroke={line2} strokeDasharray="4 4" />}
            <ReferenceDot x={min.capturedAt} y={min.priceCents} r={4} fill={warn} stroke="var(--si-bg-2)" />
            <Line type="monotone" dataKey="priceCents" stroke={accent} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
