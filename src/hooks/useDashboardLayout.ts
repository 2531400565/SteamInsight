import { usePersistedState } from './usePersistedState'

/**
 * 仪表盘卡片可定制（V4/O6）。
 *
 * 仪表盘被拆成 5 个可配置区块（速览统计是一行四张卡，作为**一个**区块整体显隐 ——
 * 逐卡排序会让 grid 布局碎片化，也远超「把不关心的内容收起来」这个真实需求）。
 * 用户可以调整区块显示顺序、隐藏不关心的区块；配置存 localStorage（视觉偏好，
 * 理由见 usePersistedState），不进 settings.json、不进数据包导出。
 */

/** 仪表盘全部可定制区块（默认顺序 = 数组顺序）。 */
export const DASHBOARD_CARDS: ReadonlyArray<{ key: DashboardCardKey; label: string; hint: string }> = [
  { key: 'stats', label: '速览统计', hint: '本周时长 / 连续天数 / 本周 TOP / 降价数' },
  { key: 'today', label: '今日摘要', hint: '今日时长、成就与史低一句话概览' },
  { key: 'chart-week', label: '本周每日游戏时间', hint: '本周 7 天柱状图' },
  { key: 'chart-trend', label: '每日趋势', hint: '每日时长曲线与 7 日移动平均' },
  { key: 'recent', label: '最近游玩', hint: '按最后启动时间排序的游戏横排' }
] as const

export type DashboardCardKey = 'stats' | 'today' | 'chart-week' | 'chart-trend' | 'recent'

export interface DashboardLayout {
  /** 全部已知 key 的展示顺序（含隐藏的）。 */
  order: DashboardCardKey[]
  /** 被隐藏的 key。 */
  hidden: DashboardCardKey[]
}

const KEY = 'dashboard-layout'

const DEFAULT_ORDER: DashboardCardKey[] = DASHBOARD_CARDS.map((c) => c.key)

/** 布局文件与代码版本可能不同步：过滤未知 key、把新增卡片补到末尾。 */
function normalize(raw: DashboardLayout): DashboardLayout {
  const known = new Set<string>(DEFAULT_ORDER)
  const order = raw.order.filter((k) => known.has(k))
  for (const k of DEFAULT_ORDER) if (!order.includes(k)) order.push(k)
  const hidden = raw.hidden.filter((k) => known.has(k) && order.includes(k))
  return { order, hidden }
}

/** 按配置产出「可见区块的渲染顺序」。 */
export function visibleCards(layout: DashboardLayout): DashboardCardKey[] {
  const { order, hidden } = normalize(layout)
  return order.filter((k) => !hidden.includes(k))
}

export function useDashboardLayout(): [DashboardLayout, (next: DashboardLayout) => void] {
  const [layout, setLayout] = usePersistedState<DashboardLayout>(KEY, {
    order: DEFAULT_ORDER,
    hidden: []
  })
  return [layout, setLayout]
}
