import type { DayPlaytime } from '@/types/steam'
import { formatHours, heatLevel } from '@/utils/format'
import { EmptyState } from '@/components/ui'

interface YearHeatmapProps {
  days: DayPlaytime[]
  year: number
  onSelect?: (date: string) => void
}

const HEAT = ['bg-heat0', 'bg-heat1', 'bg-heat2', 'bg-heat3']
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']
const STEP = 14

interface Cell {
  date: string
  minutes: number
  level: 0 | 1 | 2 | 3
}

export function YearHeatmap({ days, year, onSelect }: YearHeatmapProps) {
  const byDate = new Map<string, DayPlaytime>()
  for (const d of days) byDate.set(d.date, d)

  const first = new Date(year, 0, 1)
  const startRow = (first.getDay() + 6) % 7 // 周一=0
  const totalDays = Math.round((new Date(year + 1, 0, 1).getTime() - first.getTime()) / 86400000)
  const weeks = Math.ceil((totalDays + startRow) / 7)

  const grid: Cell[][] = []
  for (let c = 0; c < weeks; c++) {
    grid[c] = []
    for (let r = 0; r < 7; r++) {
      const dayIndex = c * 7 + r - startRow
      if (dayIndex < 0 || dayIndex >= totalDays) {
        grid[c][r] = { date: '', minutes: 0, level: 0 }
        continue
      }
      const dt = new Date(year, 0, 1 + dayIndex)
      const ymd = `${year}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
      const rec = byDate.get(ymd)
      const minutes = rec?.minutes ?? 0
      grid[c][r] = { date: ymd, minutes, level: heatLevel(minutes) }
    }
  }

  const monthLabels: Array<{ col: number; label: string }> = []
  let lastMonth = -1
  for (let c = 0; c < weeks; c++) {
    const top = grid[c][0].date ? grid[c][0] : grid[c].find((x) => x.date)
    if (!top) continue
    const m = new Date(top.date).getMonth()
    if (m !== lastMonth) {
      monthLabels.push({ col: c, label: `${m + 1}月` })
      lastMonth = m
    }
  }

  if (days.length === 0) {
    return <EmptyState title="暂无数据" description={`${year} 年还没有游玩记录`} />
  }

  return (
    <div className="select-none overflow-x-auto">
      <div className="relative ml-5" style={{ height: 16 }}>
        {monthLabels.map((m) => (
          <span key={`${m.col}-${m.label}`} className="absolute text-[10px] text-t3" style={{ left: m.col * STEP }}>
            {m.label}
          </span>
        ))}
      </div>
      <div className="flex">
        <div className="flex flex-col gap-[3px] mr-1" style={{ width: 16 }}>
          {WEEKDAYS.map((w) => (
            <span key={w} className="text-[10px] text-t3 h-[11px] leading-[11px] text-right">
              {w}
            </span>
          ))}
        </div>
        <div className="flex gap-[3px]">
          {grid.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {col.map((cell, ri) =>
                cell.date ? (
                  <div
                    key={ri}
                    title={`${cell.date} · ${formatHours(cell.minutes)} 小时`}
                    onClick={onSelect ? () => onSelect(cell.date) : undefined}
                    className={`${HEAT[cell.level]} rounded-sm transition-transform hover:scale-125 ${onSelect ? 'cursor-pointer' : ''}`}
                    style={{ width: 11, height: 11 }}
                  />
                ) : (
                  <div key={ri} style={{ width: 11, height: 11 }} />
                )
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-t3">
        <span>少</span>
        {HEAT.map((h, i) => (
          <span key={i} className={`${h} rounded-sm`} style={{ width: 11, height: 11 }} />
        ))}
        <span>多</span>
      </div>
    </div>
  )
}
