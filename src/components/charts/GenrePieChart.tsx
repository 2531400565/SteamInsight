import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { GenreShare } from '@/types/steam'
import { GENRE_COLORS } from '@/utils/constants'
import { formatMinutes, formatPercent } from '@/utils/format'
import { useCssVar, tooltipStyle } from './themeColors'
import { EmptyState } from '@/components/ui'

interface GenrePieChartProps {
  data: GenreShare[]
  height?: number
  innerRadius?: number
}

interface TipProps {
  active?: boolean
  payload?: Array<{ payload: GenreShare }>
}

function colorOf(genre: string, fallback: string): string {
  return GENRE_COLORS[genre] ?? fallback
}

export function GenrePieChart({ data, height = 280, innerRadius = 60 }: GenrePieChartProps) {
  const bg2 = useCssVar('--si-bg-2')
  const total = data.reduce((s, d) => s + d.minutes, 0)

  if (data.length === 0) {
    return <EmptyState title="暂无数据" description="还没有类型分布" />
  }

  const CustomTip = ({ active, payload }: TipProps) => {
    if (!active || !payload || payload.length === 0) return null
    const d = payload[0].payload
    return (
      <div style={tooltipStyle()}>
        <div className="text-t1 font-medium">{d.genre}</div>
        <div className="text-t2">
          {formatMinutes(d.minutes)} · {formatPercent(d.percent)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="minutes"
              nameKey="genre"
              innerRadius={innerRadius}
              outerRadius={innerRadius + 40}
              paddingAngle={2}
              stroke={bg2}
              strokeWidth={2}
            >
              {data.map((d) => (
                <Cell key={d.genre} fill={colorOf(d.genre, d.color)} />
              ))}
            </Pie>
            <Tooltip content={<CustomTip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-t3 text-xs">总时长</span>
          <span className="text-t1 text-xl font-semibold">{formatMinutes(total)}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
        {data.map((d) => (
          <div key={d.genre} className="inline-flex items-center gap-1.5 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ background: colorOf(d.genre, d.color) }}
            />
            <span className="text-t2">{d.genre}</span>
            <span className="text-t3">{formatPercent(d.percent, 0)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
