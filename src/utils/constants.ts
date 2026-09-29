import type { RangeKey } from '@/types/steam'

/** 类型分类顺序与配色（PRD 的 RPG/FPS/策略/模拟/独立/其他 基础上补足 动作/冒险，其余归入「其他」） */
export const GENRE_ORDER = ['RPG', 'FPS', '策略', '模拟', '独立', '动作', '冒险', '其他'] as const
export type GenreKey = (typeof GENRE_ORDER)[number]

export const GENRE_COLORS: Record<string, string> = {
  RPG: '#a78bfa',
  FPS: '#f87171',
  策略: '#fbbf24',
  模拟: '#34d399',
  独立: '#f472b6',
  动作: '#fb923c',
  冒险: '#38bdf8',
  其他: '#94a3b8'
}

export const GENRE_FALLBACK = '其他'

export function normalizeGenre(raw: string): GenreKey {
  const g = raw.trim()
  if ((GENRE_ORDER as readonly string[]).includes(g)) return g as GenreKey
  if (g === '体育' || g === '竞速' || g === '休闲' || g === '免费' || g === '大型多人在线') return '其他'
  return '其他'
}

export const RANGE_OPTIONS: Array<{ value: RangeKey; label: string }> = [
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' },
  { value: 'all', label: '全部' }
]

export const RANGE_LABELS: Record<RangeKey, string> = {
  week: '本周',
  month: '本月',
  year: '本年',
  all: '全部时间'
}

/** 折扣商城四个 Tab */
export const DISCOUNT_TABS = [
  { key: 'hot', label: '今日热门', hint: '热门且正在打折' },
  { key: 'lowest', label: '史低专区', hint: '接近历史最低价' },
  { key: 'toprated', label: '高评分折扣', hint: '好评率 ≥ 90%' },
  { key: 'free', label: '限时免费', hint: '当前可免费领取' }
] as const

export const SYNC_INTERVALS = [15, 30, 60] as const

/** 检测不到 Steam 官方 API 时的提示语（按 PRD 要求只提示 Watt Toolkit，不提 VPN） */
export const NETWORK_HINT = '建议开启 Watt Toolkit 后重试。'
