import { useMemo, useState } from 'react'

/**
 * 时间范围切换（V3 / O-6）。
 *
 * 为什么需要：`price_history` 每次同步记一行，一款游戏攒到几十上百个采样点后，
 * 折线会挤成一团看不清；而每日趋势图原本只有 30 天，想看更长周期又做不到。
 * 数据本来就在手里（分析层一次给了 365 天），缺的只是一个「只看多久」的开关。
 *
 * 三档是有意的：30 天看近期波动、90 天看季节性、全部看长期走向。
 * 再多的档位只会变成噪音 —— 用户不会记住第 4 档是什么。
 */
export const RANGE_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 30, label: '30 天' },
  { value: 90, label: '90 天' },
  { value: 0, label: '全部' }
]

const STORAGE_NS = 'si-chart-range'

/**
 * 档位按**图表的身份键**分别记忆 —— 价格走势和每日趋势是两个不同的图，
 * 不应该共享同一个选择（选了「价格看全部」不代表也想「趋势看全部」）。
 *
 * 落点是 localStorage 而不是 settings.json：这是纯视觉偏好，
 * 既不需要跨进程 IPC，也不该出现在导出的数据包里。
 */
function readStored(key: string, fallback: number): number {
  try {
    const v = window.localStorage.getItem(`${STORAGE_NS}:${key}`)
    if (v === null) return fallback
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 ? n : fallback
  } catch {
    // 隐私模式 / 禁用存储时 localStorage 会抛 —— 视觉偏好丢了不影响任何功能
    return fallback
  }
}

function writeStored(key: string, value: number): void {
  try {
    window.localStorage.setItem(`${STORAGE_NS}:${key}`, String(value))
  } catch {
    /* 同上：存不下就算了 */
  }
}

export function useChartRange(storageKey: string, fallback = 30): [number, (v: number) => void] {
  const [range, setRange] = useState<number>(() => readStored(storageKey, fallback))
  return [
    range,
    (v: number) => {
      setRange(v)
      writeStored(storageKey, v)
    }
  ]
}

/** 最近 N 天的本地日期下界（YYYY-MM-DD）。days<=0 表示不限。 */
function ymdThreshold(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days + 1)
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 按 YYYY-MM-DD 字符串裁掉过早的行。days<=0 返回原数组。 */
export function useRangedByDate<T>(rows: T[], days: number, dateOf: (row: T) => string): T[] {
  return useMemo(() => {
    if (days <= 0) return rows
    const threshold = ymdThreshold(days)
    return rows.filter((r) => dateOf(r) >= threshold)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, days])
}

/** 按 unix 秒时间戳裁掉过早的行。days<=0 返回原数组。 */
export function useRangedBySeconds<T>(rows: T[], days: number, secondsOf: (row: T) => number): T[] {
  return useMemo(() => {
    if (days <= 0) return rows
    const threshold = Math.floor(Date.now() / 1000) - days * 86400
    return rows.filter((r) => secondsOf(r) >= threshold)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, days])
}

interface RangeTabsProps {
  value: number
  onChange: (v: number) => void
  /** 当前这一档实际画了几个点 —— 让用户一眼看出是不是把数据滤空了 */
  shownCount: number
  totalCount: number
}

export function RangeTabs({ value, onChange, shownCount, totalCount }: RangeTabsProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-t3">
        {shownCount}/{totalCount} 个点
      </span>
      <div role="tablist" aria-label="图表时间范围" className="flex items-center gap-0.5 rounded-pill border border-line bg-bg1/60 p-0.5">
        {RANGE_OPTIONS.map((o) => {
          const active = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(o.value)}
              className={`rounded-pill px-2.5 py-1 text-[11.5px] transition-colors ${
                active ? 'bg-accent/15 text-accent' : 'text-t3 hover:text-t1'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
